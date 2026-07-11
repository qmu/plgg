import {
  SoftStr,
  Result,
  ok,
  err,
  pipe,
  matchOption,
  chainResult,
  mapResult,
} from "plgg";
import {
  Sexp,
  ListExp,
  SymbolExp,
  isSymbolExp,
  sexpRange,
  boolExp,
  sourcePos,
  sourceRange,
} from "plgg-ir-syntax";
import {
  SemDiagnostic,
  TypedExpr,
  AnalysisContext,
  Scope,
  rootScope,
  booleanType,
  semTypeEquals,
  formatSemType,
  typedExprType,
  litExpr,
  semError,
  semMismatch,
  allOrErrors,
} from "plgg-ir-language";
import {
  codeNonBooleanCondition,
  codeBadProjection,
  codeBadPolicy,
} from "plgg-ir-manifest/domain/model/ManifestCode";
import {
  Projection,
  ProjectedField,
  projection,
} from "plgg-ir-manifest/domain/model/Projection";
import {
  Policy,
  policy,
} from "plgg-ir-manifest/domain/model/Policy";
import {
  PathRoot,
  ResolvedPath,
  entityRoot,
  actorRoot,
  isValueTerminal,
} from "plgg-ir-manifest/domain/model/Path";
import {
  Module,
  entityOf,
} from "plgg-ir-manifest/domain/model/Module";
import {
  clausesNamed,
  childrenOf,
  symbolArg,
  exprArg,
} from "plgg-ir-manifest/domain/usecase/clause";
import { resolvePath } from "plgg-ir-manifest/domain/usecase/resolvePath";
import { scopeWithPaths } from "plgg-ir-manifest/domain/usecase/bindExprPaths";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * The single element of a verified one-element array
 * (the fallback keeps the fold total; it is
 * unreachable once the length was checked).
 */
export const onlyOf = <A>(
  items: ReadonlyArray<A>,
  fallback: A,
): A =>
  items.slice(0, 1).reduce((_, a) => a, fallback);

/**
 * The shared boolean-literal fallback for verified
 * folds over checked expressions.
 */
export const litTrue: TypedExpr = litExpr(
  booleanType,
  boolExp(
    true,
    sourceRange(
      sourcePos(0, 1, 1),
      sourcePos(0, 1, 1),
    ),
  ),
);

/**
 * Checks a manifest condition with dotted paths bound
 * first (design.md §14), requiring boolean.
 */
export const checkPathCondition = (
  m: Module,
  ctx: AnalysisContext<Module>,
  roots: ReadonlyArray<PathRoot>,
  base: Scope,
  exp: Sexp,
): Result<TypedExpr, Diags> =>
  pipe(
    scopeWithPaths(m, roots, base)(exp),
    chainResult((scope: Scope) =>
      ctx.checkExpr(exp, scope),
    ),
    chainResult(
      (e: TypedExpr): Result<TypedExpr, Diags> =>
        semTypeEquals(booleanType)(
          typedExprType(e),
        )
          ? ok(e)
          : err([
              semMismatch(
                codeNonBooleanCondition,
                `condition must be boolean but is ${formatSemType(typedExprType(e))}`,
                sexpRange(exp),
                "boolean",
                formatSemType(typedExprType(e)),
              ),
            ]),
    ),
  );

/**
 * The symbol arguments of every `(name ...)` clause
 * on a form.
 */
export const symbolArgsOf = (
  form: ListExp,
  clause: SoftStr,
): ReadonlyArray<SymbolExp> =>
  clausesNamed(form, clause).flatMap((c) =>
    pipe(
      symbolArg(c, 1),
      matchOption(
        (): ReadonlyArray<SymbolExp> => [],
        (s: SymbolExp) => [s],
      ),
    ),
  );

/**
 * The single expression arguments of every
 * `(name ...)` clause on a form.
 */
export const exprArgsOf = (
  form: ListExp,
  clause: SoftStr,
): ReadonlyArray<Sexp> =>
  clausesNamed(form, clause).flatMap((c) =>
    pipe(
      exprArg(c, 1),
      matchOption(
        (): ReadonlyArray<Sexp> => [],
        (e: Sexp) => [e],
      ),
    ),
  );

/**
 * The roots a policy condition may reference: the
 * actor plus every declared entity by name — the use
 * site binds the concrete subject (design.md §10).
 */
export const policyRoots = (
  m: Module,
): ReadonlyArray<PathRoot> => [
  actorRoot("actor"),
  ...m.entities.map((e) =>
    entityRoot(e.name, e.name),
  ),
];

/**
 * Parses `(projection <name> (from <entity>)
 * (fields <entity>.<field> ...))` — the deliberate
 * boundary-crossing surface of design.md §15.
 */
export const parseProjection =
  (m: Module) =>
  (form: ListExp): Result<Projection, Diags> =>
    pipe(
      symbolArg(form, 1),
      matchOption(
        (): Result<Projection, Diags> =>
          err([
            semError(
              codeBadProjection,
              "a projection needs (projection <name> ...)",
              form.content.range,
            ),
          ]),
        (name: SymbolExp) =>
          pipe(
            symbolArgsOf(form, "from").map(
              (f) => f.content.name,
            ),
            (froms: ReadonlyArray<SoftStr>) =>
              froms.length !== 1 ||
              !froms.every(
                (f) => entityOf(m, f).length > 0,
              )
                ? err([
                    semError(
                      codeBadProjection,
                      "a projection needs exactly one (from <declared-entity>)",
                      form.content.range,
                    ),
                  ])
                : pipe(
                    allOrErrors(
                      clausesNamed(form, "fields")
                        .flatMap(childrenOf)
                        .filter(isSymbolExp)
                        .map((p) =>
                          projectedFieldOf(
                            m,
                            onlyOf(froms, ""),
                            p,
                          ),
                        ),
                    ),
                    mapResult(
                      (
                        fields: ReadonlyArray<ProjectedField>,
                      ): Projection =>
                        projection(
                          name.content.name,
                          onlyOf(froms, ""),
                          fields,
                          form.content.range,
                        ),
                    ),
                  ),
          ),
      ),
    );

/**
 * Resolves one projected field path (`client.name`)
 * as a direct field of the projection's source.
 */
const projectedFieldOf = (
  m: Module,
  from: SoftStr,
  p: SymbolExp,
): Result<ProjectedField, Diags> =>
  pipe(
    resolvePath(m, [entityRoot(from, from)])(
      p.content.name,
      p.content.range,
    ),
    chainResult(
      (
        r: ResolvedPath,
      ): Result<ProjectedField, Diags> =>
        isValueTerminal(r.terminal) &&
        r.prefixes.length === 0
          ? ok({
              name: p.content.name
                .split(".")
                .slice(-1)
                .join(""),
              type: r.terminal.content.type,
            })
          : err([
              semError(
                codeBadProjection,
                `projected field ${JSON.stringify(p.content.name)} must be a direct field of ${JSON.stringify(from)}`,
                p.content.range,
              ),
            ]),
    ),
  );

/**
 * Parses `(policy <name> (allows <condition>))`
 * (design.md §10); the condition must type to
 * boolean (design.md §16.8).
 */
export const parsePolicy =
  (m: Module, ctx: AnalysisContext<Module>) =>
  (form: ListExp): Result<Policy, Diags> =>
    pipe(
      symbolArg(form, 1),
      matchOption(
        (): Result<Policy, Diags> =>
          err([
            semError(
              codeBadPolicy,
              "a policy needs (policy <name> (allows <condition>))",
              form.content.range,
            ),
          ]),
        (name: SymbolExp) =>
          pipe(
            exprArgsOf(form, "allows"),
            (conditions) =>
              conditions.length !== 1
                ? err([
                    semError(
                      codeBadPolicy,
                      "a policy needs exactly one (allows <condition>)",
                      form.content.range,
                    ),
                  ])
                : pipe(
                    allOrErrors(
                      conditions.map((c) =>
                        checkPathCondition(
                          m,
                          ctx,
                          policyRoots(m),
                          rootScope([]),
                          c,
                        ),
                      ),
                    ),
                    mapResult(
                      (
                        checked: ReadonlyArray<TypedExpr>,
                      ): Policy =>
                        policy(
                          name.content.name,
                          onlyOf(
                            checked,
                            litTrue,
                          ),
                          form.content.range,
                        ),
                    ),
                  ),
          ),
      ),
    );
