import {
  SoftStr,
  Result,
  Option,
  ok,
  err,
  some,
  none,
  pipe,
  matchOption,
  chainResult,
  mapResult,
} from "plgg";
import {
  Sexp,
  ListExp,
  SymbolExp,
  isListExp,
  sexpRange,
} from "plgg-ir-syntax";
import {
  SemType,
  SemDiagnostic,
  TypedExpr,
  AnalysisContext,
  Scope,
  rootScope,
  formatSemType,
  typedExprType,
  isAssignable,
  semError,
  semMismatch,
  codeTypeMismatch,
  allOrErrors,
} from "plgg-ir-language";
import {
  codeBadAction,
  codeMissingAuthorize,
  codeBadEffect,
} from "plgg-ir-manifest/domain/model/ManifestCode";
import { Field } from "plgg-ir-manifest/domain/model/Field";
import {
  Action,
  Effect,
  Ensure,
  action,
  effect,
  validEnsure,
  exprEnsure,
} from "plgg-ir-manifest/domain/model/Action";
import {
  PathRoot,
  ResolvedPath,
  entityRoot,
  fieldsRoot,
  actorRoot,
  isValueTerminal,
} from "plgg-ir-manifest/domain/model/Path";
import {
  Module,
  entityOf,
} from "plgg-ir-manifest/domain/model/Module";
import {
  hasHead,
  isClause,
  clausesNamed,
  childrenOf,
  symbolArg,
  exprArg,
} from "plgg-ir-manifest/domain/usecase/clause";
import { resolvePath } from "plgg-ir-manifest/domain/usecase/resolvePath";
import { scopeWithPaths } from "plgg-ir-manifest/domain/usecase/bindExprPaths";
import {
  onlyOf,
  checkPathCondition,
  symbolArgsOf,
} from "plgg-ir-manifest/domain/usecase/analyzeWeb";
import { analyzeInputFields } from "plgg-ir-manifest/domain/usecase/analyzeManifest";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * The path roots an action's expressions see: its
 * subject entity, its typed input fields, and the
 * actor (design.md §12).
 */
const actionRoots = (
  subject: SoftStr,
  inputs: ReadonlyArray<Field>,
): ReadonlyArray<PathRoot> => [
  entityRoot(subject, subject),
  fieldsRoot("input", inputs),
  actorRoot("actor"),
];

/**
 * Parses `(action <name> (subject <entity>)
 * [(input (field ...)*)] [(authorize (policy <p>))]
 * [(effect (set <path> <expr>)*)] [(ensure ...)*])`
 * (design.md §12). Deny-by-default: an action with
 * effects and no authorization is a compile error
 * (design.md §36.1, §16.8).
 */
export const parseAction =
  (m: Module, ctx: AnalysisContext<Module>) =>
  (form: ListExp): Result<Action, Diags> =>
    pipe(
      symbolArg(form, 1),
      matchOption(
        (): Result<Action, Diags> =>
          err([
            semError(
              codeBadAction,
              "an action needs (action <name> ...)",
              form.content.range,
            ),
          ]),
        (name: SymbolExp) =>
          pipe(
            symbolArgsOf(form, "subject").map(
              (s) => s.content.name,
            ),
            (subjects) =>
              subjects.length !== 1 ||
              !subjects.every(
                (s) => entityOf(m, s).length > 0,
              )
                ? err([
                    semError(
                      codeBadAction,
                      "an action needs exactly one (subject <declared-entity>)",
                      form.content.range,
                    ),
                  ])
                : buildAction(
                    m,
                    ctx,
                    form,
                    name,
                    onlyOf(subjects, ""),
                  ),
          ),
      ),
    );

/**
 * Builds the action once name and subject are known:
 * input fields first (they root `input.*` paths),
 * then authorize, effects, ensures, and the
 * deny-by-default gate.
 */
const buildAction = (
  m: Module,
  ctx: AnalysisContext<Module>,
  form: ListExp,
  name: SymbolExp,
  subject: SoftStr,
): Result<Action, Diags> =>
  pipe(
    analyzeInputFields(
      ctx,
      clausesNamed(form, "input").flatMap((i) =>
        childrenOf(i).filter(isClause("field")),
      ),
    ),
    chainResult(
      (
        inputs: ReadonlyArray<Field>,
      ): Result<Action, Diags> =>
        pipe(
          allOrErrors(
            clausesNamed(form, "effect")
              .flatMap(childrenOf)
              .map((set) =>
                effectOf(
                  m,
                  ctx,
                  subject,
                  inputs,
                  set,
                ),
              ),
          ),
          chainResult(
            (
              effects: ReadonlyArray<Effect>,
            ): Result<Action, Diags> =>
              pipe(
                allOrErrors(
                  clausesNamed(
                    form,
                    "ensure",
                  ).map((e) =>
                    ensureOf(
                      m,
                      ctx,
                      subject,
                      inputs,
                      e,
                    ),
                  ),
                ),
                chainResult(
                  (
                    ensures: ReadonlyArray<Ensure>,
                  ): Result<Action, Diags> =>
                    pipe(
                      authorizeOf(form),
                      (
                        authorize: Option<SoftStr>,
                      ) =>
                        effects.length > 0 &&
                        authorize.__tag === "None"
                          ? err([
                              semError(
                                codeMissingAuthorize,
                                `action ${JSON.stringify(name.content.name)} has effects but no (authorize (policy ...)) — no policy means denied`,
                                form.content
                                  .range,
                              ),
                            ])
                          : ok(
                              action(
                                name.content.name,
                                subject,
                                inputs,
                                authorize,
                                effects,
                                ensures,
                                form.content
                                  .range,
                              ),
                            ),
                    ),
                ),
              ),
          ),
        ),
    ),
  );

/**
 * The `(authorize (policy <p>))` reference, when
 * declared (existence is verified module-wide).
 */
const authorizeOf = (
  form: ListExp,
): Option<SoftStr> =>
  clausesNamed(form, "authorize")
    .flatMap((a) =>
      clausesNamed(a, "policy").flatMap((p) =>
        pipe(
          symbolArg(p, 1),
          matchOption(
            (): ReadonlyArray<SoftStr> => [],
            (s: SymbolExp) => [s.content.name],
          ),
        ),
      ),
    )
    .reduce<Option<SoftStr>>(
      (_, n) => some(n),
      none(),
    );

/**
 * Parses one `(set <subject-path> <expr>)` effect:
 * the target must be a direct field of the subject
 * (design.md §12), and the value's type must be
 * assignable to it.
 */
const effectOf = (
  m: Module,
  ctx: AnalysisContext<Module>,
  subject: SoftStr,
  inputs: ReadonlyArray<Field>,
  set: Sexp,
): Result<Effect, Diags> =>
  !isListExp(set) || !hasHead("set")(set)
    ? err([
        semError(
          codeBadEffect,
          "an effect must be (set <subject-field> <expr>)",
          sexpRange(set),
        ),
      ])
    : pipe(
        symbolArg(set, 1),
        matchOption(
          (): Result<Effect, Diags> =>
            err([
              semError(
                codeBadEffect,
                "an effect must be (set <subject-field> <expr>)",
                set.content.range,
              ),
            ]),
          (target: SymbolExp) =>
            pipe(
              resolvePath(
                m,
                actionRoots(subject, inputs),
              )(
                target.content.name,
                target.content.range,
              ),
              chainResult(
                (
                  p: ResolvedPath,
                ): Result<Effect, Diags> =>
                  !isValueTerminal(p.terminal) ||
                  p.root !== subject ||
                  p.prefixes.length > 0
                    ? err([
                        semError(
                          codeBadEffect,
                          `(set ...) must target a direct field of the subject, not ${JSON.stringify(p.text)}`,
                          p.range,
                        ),
                      ])
                    : setValueOf(
                        m,
                        ctx,
                        subject,
                        inputs,
                        set,
                        p,
                        p.terminal.content.type,
                      ),
              ),
            ),
        ),
      );

/**
 * Checks the value expression of one `(set ...)`
 * against the target field's type.
 */
const setValueOf = (
  m: Module,
  ctx: AnalysisContext<Module>,
  subject: SoftStr,
  inputs: ReadonlyArray<Field>,
  set: ListExp,
  target: ResolvedPath,
  targetType: SemType,
): Result<Effect, Diags> =>
  pipe(
    exprArg(set, 2),
    matchOption(
      (): Result<Effect, Diags> =>
        err([
          semError(
            codeBadEffect,
            "(set ...) needs a value expression",
            set.content.range,
          ),
        ]),
      (value: Sexp) =>
        pipe(
          scopeWithPaths(
            m,
            actionRoots(subject, inputs),
            rootScope([]),
          )(value),
          chainResult((scope: Scope) =>
            ctx.checkExpr(value, scope),
          ),
          chainResult(
            (
              e: TypedExpr,
            ): Result<Effect, Diags> =>
              isAssignable(targetType)(
                typedExprType(e),
              )
                ? ok(
                    effect(
                      target,
                      e,
                      set.content.range,
                    ),
                  )
                : err([
                    semMismatch(
                      codeTypeMismatch,
                      `cannot set ${JSON.stringify(target.text)}: expected ${formatSemType(targetType)} but found ${formatSemType(typedExprType(e))}`,
                      set.content.range,
                      formatSemType(targetType),
                      formatSemType(
                        typedExprType(e),
                      ),
                    ),
                  ]),
          ),
        ),
    ),
  );

/**
 * Parses one `(ensure ...)` postcondition: the
 * whole-entity `(valid <subject>)` assertion or a
 * boolean condition (design.md §12).
 */
const ensureOf = (
  m: Module,
  ctx: AnalysisContext<Module>,
  subject: SoftStr,
  inputs: ReadonlyArray<Field>,
  e: ListExp,
): Result<Ensure, Diags> =>
  pipe(
    exprArg(e, 1),
    matchOption(
      (): Result<Ensure, Diags> =>
        err([
          semError(
            codeBadAction,
            "(ensure ...) needs a condition",
            e.content.range,
          ),
        ]),
      (condition: Sexp) =>
        isClause("valid")(condition)
          ? pipe(
              symbolArg(condition, 1),
              matchOption(
                (): Result<Ensure, Diags> =>
                  err([
                    semError(
                      codeBadAction,
                      "(valid ...) names the action subject",
                      condition.content.range,
                    ),
                  ]),
                (s: SymbolExp) =>
                  s.content.name === subject
                    ? ok(
                        validEnsure(
                          subject,
                          e.content.range,
                        ),
                      )
                    : err([
                        semError(
                          codeBadAction,
                          `(valid ...) must name the subject ${JSON.stringify(subject)}`,
                          s.content.range,
                        ),
                      ]),
              ),
            )
          : pipe(
              checkPathCondition(
                m,
                ctx,
                actionRoots(subject, inputs),
                rootScope([]),
                condition,
              ),
              mapResult(
                (checked: TypedExpr): Ensure =>
                  exprEnsure(
                    checked,
                    e.content.range,
                  ),
              ),
            ),
    ),
  );
