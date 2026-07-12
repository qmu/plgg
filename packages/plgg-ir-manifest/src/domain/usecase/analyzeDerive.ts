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
  isSymbolExp,
  sexpRange,
} from "plgg-ir-syntax";
import {
  SemDiagnostic,
  TypedExpr,
  AnalysisContext,
  Scope,
  Binding,
  rootScope,
  binding,
  integerType,
  isPrimType,
  isParamType,
  isAssignable,
  formatSemType,
  typedExprType,
  semError,
  semMismatch,
  codeTypeMismatch,
  allOrErrors,
} from "plgg-ir-language";
import { codeBadDerive } from "plgg-ir-manifest/domain/model/ManifestCode";
import {
  Field,
  withDerivation,
} from "plgg-ir-manifest/domain/model/Field";
import { Consistency } from "plgg-ir-manifest/domain/model/Aggregate";
import {
  Dep,
  Derivation,
  fieldDep,
  relationDep,
  countDerivation,
  sumDerivation,
  exprDerivation,
} from "plgg-ir-manifest/domain/model/Derivation";
import {
  Entity,
  fieldOf,
  relationOf,
} from "plgg-ir-manifest/domain/model/Entity";
import {
  Module,
  entityOf,
} from "plgg-ir-manifest/domain/model/Module";
import {
  ResolvedPath,
  entityRoot,
  isValueTerminal,
  isEntityTerminal,
} from "plgg-ir-manifest/domain/model/Path";
import {
  hasHead,
  isClause,
  clausesNamed,
  symbolArg,
  exprArg,
} from "plgg-ir-manifest/domain/usecase/clause";
import { resolvePath } from "plgg-ir-manifest/domain/usecase/resolvePath";
import { scopeWithPaths } from "plgg-ir-manifest/domain/usecase/bindExprPaths";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * Is this type summable — numeric or money?
 */
const isSummable = (t: Field["type"]): boolean =>
  (isPrimType(t) &&
    (t.content.name === "integer" ||
      t.content.name === "decimal")) ||
  (isParamType(t) && t.content.name === "money");

/**
 * Resolves every `(derive ...)` / `(materialize ...)`
 * clause of a module's entities against the FULL
 * entity graph (derivations may reach entities
 * declared later), attaching {@link Derivation}s to
 * the fields (design.md §13). A `materialize` without
 * a `derive` is rejected — materialized fields must
 * identify their source (design.md §36.6).
 */
export const resolveDerives = (
  ctx: AnalysisContext<Module>,
  m: Module,
  entityForms: ReadonlyArray<ListExp>,
): Result<ReadonlyArray<Entity>, Diags> =>
  allOrErrors(
    m.entities.map((e) =>
      pipe(
        entityForms.filter((form) =>
          pipe(
            symbolArg(form, 1),
            matchOption(
              (): boolean => false,
              (s: SymbolExp) =>
                s.content.name === e.name,
            ),
          ),
        ),
        (forms) =>
          forms
            .map((form) =>
              resolveEntityDerives(
                ctx,
                m,
                e,
                form,
              ),
            )
            .reduce<Result<Entity, Diags>>(
              (_, r) => r,
              ok(e),
            ),
      ),
    ),
  );

/**
 * Resolves one entity's derive clauses.
 */
const resolveEntityDerives = (
  ctx: AnalysisContext<Module>,
  m: Module,
  e: Entity,
  form: ListExp,
): Result<Entity, Diags> =>
  pipe(
    allOrErrors(
      e.fields.map((f) =>
        pipe(
          clausesNamed(form, "field").filter(
            (fc) =>
              pipe(
                symbolArg(fc, 1),
                matchOption(
                  (): boolean => false,
                  (s: SymbolExp) =>
                    s.content.name === f.name,
                ),
              ),
          ),
          (fieldForms) =>
            fieldForms
              .map((fc) =>
                resolveFieldDerive(
                  ctx,
                  m,
                  e,
                  f,
                  fc,
                ),
              )
              .reduce<Result<Field, Diags>>(
                (_, r) => r,
                ok(f),
              ),
        ),
      ),
    ),
    mapResult(
      (fields: ReadonlyArray<Field>): Entity => ({
        ...e,
        fields,
      }),
    ),
  );

/**
 * Resolves one field's `(derive ...)` and
 * `(materialize (consistency ...))` clauses.
 */
const resolveFieldDerive = (
  ctx: AnalysisContext<Module>,
  m: Module,
  e: Entity,
  f: Field,
  fieldForm: ListExp,
): Result<Field, Diags> =>
  pipe(
    clausesNamed(fieldForm, "derive"),
    (derives) =>
      pipe(
        materializeOf(fieldForm),
        chainResult(
          (
            materialize: Option<Consistency>,
          ): Result<Field, Diags> =>
            derives.length === 0
              ? materialize.__tag === "Some"
                ? err([
                    semError(
                      codeBadDerive,
                      "(materialize ...) requires a (derive ...) — materialized fields must identify their source",
                      fieldForm.content.range,
                    ),
                  ])
                : ok(f)
              : derives.length > 1
                ? err([
                    semError(
                      codeBadDerive,
                      "a field takes at most one (derive ...)",
                      fieldForm.content.range,
                    ),
                  ])
                : pipe(
                    allOrErrors(
                      derives.map((d) =>
                        derivationOf(
                          ctx,
                          m,
                          e,
                          f,
                          d,
                        ),
                      ),
                    ),
                    mapResult(
                      (
                        resolved: ReadonlyArray<Derivation>,
                      ): Field =>
                        pipe(
                          f,
                          withDerivation(
                            resolved
                              .slice(0, 1)
                              .reduce<
                                Option<Derivation>
                              >(
                                (_, d) => some(d),
                                none(),
                              ),
                            materialize,
                          ),
                        ),
                    ),
                  ),
        ),
      ),
  );

/**
 * The `(materialize (consistency ...))` mode, when
 * declared.
 */
const materializeOf = (
  fieldForm: ListExp,
): Result<Option<Consistency>, Diags> =>
  pipe(
    clausesNamed(fieldForm, "materialize"),
    (mats) =>
      pipe(
        mats.flatMap((mat) =>
          clausesNamed(
            mat,
            "consistency",
          ).flatMap((c) =>
            pipe(
              symbolArg(c, 1),
              matchOption(
                (): ReadonlyArray<SymbolExp> => [],
                (s: SymbolExp) => [s],
              ),
            ),
          ),
        ),
        (modes) =>
          mats.length === 0
            ? ok(none())
            : modes.length === 1 &&
                modes.every(
                  (s) =>
                    s.content.name ===
                      "immediate" ||
                    s.content.name === "eventual",
                )
              ? ok(
                  modes.reduce<
                    Option<Consistency>
                  >(
                    (_, s) =>
                      s.content.name ===
                      "immediate"
                        ? some("immediate")
                        : some("eventual"),
                    none(),
                  ),
                )
              : err([
                  semError(
                    codeBadDerive,
                    "(materialize ...) takes exactly one (consistency immediate|eventual)",
                    fieldForm.content.range,
                  ),
                ]),
      ),
  );

/**
 * Resolves one `(derive <how>)` clause: a member
 * count, a member-field sum, or a plain expression
 * over the entity's reachable values (design.md §6,
 * §13). The result type must be assignable to the
 * field's declared type.
 */
const derivationOf = (
  ctx: AnalysisContext<Module>,
  m: Module,
  e: Entity,
  f: Field,
  d: ListExp,
): Result<Derivation, Diags> =>
  pipe(
    exprArg(d, 1),
    matchOption(
      (): Result<Derivation, Diags> =>
        err([
          semError(
            codeBadDerive,
            "(derive ...) needs a computation",
            d.content.range,
          ),
        ]),
      (how: Sexp) =>
        isClause("count")(how)
          ? countOf(m, e, f, how)
          : isClause("sum")(how)
            ? sumOf(m, e, f, how)
            : exprDeriveOf(ctx, m, e, f, how),
    ),
  );

/**
 * `(count <relation-path>)` — the collection is a
 * relation of the entity; the field must accept an
 * integer.
 */
const countOf = (
  m: Module,
  e: Entity,
  f: Field,
  how: ListExp,
): Result<Derivation, Diags> =>
  pipe(
    symbolArg(how, 1),
    matchOption(
      (): Result<Derivation, Diags> =>
        err([
          semError(
            codeBadDerive,
            "(count ...) needs a collection path",
            how.content.range,
          ),
        ]),
      (path: SymbolExp) =>
        pipe(
          resolvePath(m, [
            entityRoot(e.name, e.name),
          ])(
            path.content.name,
            path.content.range,
          ),
          chainResult(
            (
              p: ResolvedPath,
            ): Result<Derivation, Diags> =>
              !isEntityTerminal(p.terminal) ||
              !p.throughMany ||
              p.prefixes.length !== 1
                ? err([
                    semError(
                      codeBadDerive,
                      `(count ...) needs a direct collection relation, not ${JSON.stringify(p.text)}`,
                      p.range,
                    ),
                  ])
                : !isAssignable(f.type)(
                      integerType,
                    )
                  ? err([
                      semMismatch(
                        codeTypeMismatch,
                        `(count ...) produces integer but the field is ${formatSemType(f.type)}`,
                        p.range,
                        formatSemType(f.type),
                        "integer",
                      ),
                    ])
                  : ok(
                      countDerivation(
                        lastSegment(
                          path.content.name,
                        ),
                        p.terminal.content.entity,
                        [
                          relationDep(
                            e.name,
                            lastSegment(
                              path.content.name,
                            ),
                            p.terminal.content
                              .entity,
                          ),
                        ],
                        how.content.range,
                      ),
                    ),
          ),
        ),
    ),
  );

/**
 * `(sum (children <relation> <field>))` — sums a
 * member field over a collection relation; the member
 * field must be summable and the result assignable to
 * the deriving field.
 */
const sumOf = (
  m: Module,
  e: Entity,
  f: Field,
  how: ListExp,
): Result<Derivation, Diags> =>
  pipe(
    exprArg(how, 1),
    matchOption(
      (): Option<ListExp> => none(),
      (arg: Sexp): Option<ListExp> =>
        isListExp(arg) && hasHead("children")(arg)
          ? some(arg)
          : none(),
    ),
    matchOption(
      (): Result<Derivation, Diags> =>
        err([
          semError(
            codeBadDerive,
            "(sum ...) takes (children <relation> <field>)",
            how.content.range,
          ),
        ]),
      (children: ListExp) =>
        pipe(
          symbolArg(children, 1),
          matchOption(
            (): Result<Derivation, Diags> =>
              err([badChildren(children)]),
            (rel: SymbolExp) =>
              pipe(
                symbolArg(children, 2),
                matchOption(
                  (): Result<Derivation, Diags> =>
                    err([badChildren(children)]),
                  (fld: SymbolExp) =>
                    sumChildrenOf(
                      m,
                      e,
                      f,
                      how,
                      rel,
                      fld,
                    ),
                ),
              ),
          ),
        ),
    ),
  );

/**
 * The malformed `(children ...)` diagnostic.
 */
const badChildren = (
  children: ListExp,
): SemDiagnostic =>
  semError(
    codeBadDerive,
    "(children ...) takes a relation then a member field",
    children.content.range,
  );

/**
 * Resolves the relation and member field of one
 * verified `(children <relation> <field>)`.
 */
const sumChildrenOf = (
  m: Module,
  e: Entity,
  f: Field,
  how: ListExp,
  rel: SymbolExp,
  fld: SymbolExp,
): Result<Derivation, Diags> =>
  pipe(
    relationOf(e, rel.content.name).filter(
      (r) => r.cardinality === "many",
    ),
    (rels) =>
      rels.length === 0
        ? err([
            semError(
              codeBadDerive,
              `(children ...) needs a collection relation of ${JSON.stringify(e.name)}, not ${JSON.stringify(rel.content.name)}`,
              rel.content.range,
            ),
          ])
        : pipe(
            rels.flatMap((r) =>
              entityOf(m, r.target).flatMap(
                (target) =>
                  fieldOf(
                    target,
                    fld.content.name,
                  ).map((memberField) => ({
                    target: r.target,
                    memberField,
                  })),
              ),
            ),
            (members) =>
              members.length === 0
                ? err([
                    semError(
                      codeBadDerive,
                      `${JSON.stringify(fld.content.name)} is not a field of the relation's target`,
                      fld.content.range,
                    ),
                  ])
                : members
                    .map(
                      (
                        mb,
                      ): Result<
                        Derivation,
                        Diags
                      > =>
                        !isSummable(
                          mb.memberField.type,
                        )
                          ? err([
                              semError(
                                codeBadDerive,
                                `(sum ...) needs a numeric or money member field, not ${formatSemType(mb.memberField.type)}`,
                                fld.content.range,
                              ),
                            ])
                          : !isAssignable(f.type)(
                                mb.memberField
                                  .type,
                              )
                            ? err([
                                semMismatch(
                                  codeTypeMismatch,
                                  `(sum ...) produces ${formatSemType(mb.memberField.type)} but the field is ${formatSemType(f.type)}`,
                                  fld.content
                                    .range,
                                  formatSemType(
                                    f.type,
                                  ),
                                  formatSemType(
                                    mb.memberField
                                      .type,
                                  ),
                                ),
                              ])
                            : ok(
                                sumDerivation(
                                  rel.content
                                    .name,
                                  mb.target,
                                  fld.content
                                    .name,
                                  mb.memberField
                                    .type,
                                  [
                                    relationDep(
                                      e.name,
                                      rel.content
                                        .name,
                                      mb.target,
                                    ),
                                    fieldDep(
                                      mb.target,
                                      fld.content
                                        .name,
                                    ),
                                  ],
                                  how.content
                                    .range,
                                ),
                              ),
                    )
                    .reduce(
                      (_, r) => r,
                      err([
                        semError(
                          codeBadDerive,
                          "unreachable: member verified",
                          how.content.range,
                        ),
                      ]),
                    ),
          ),
  );

/**
 * A plain derivation expression over the entity's
 * fields and reachable paths (`(* subtotal
 * tax-rate)`, design.md §8); its type must be
 * assignable to the field's.
 */
const exprDeriveOf = (
  ctx: AnalysisContext<Module>,
  m: Module,
  e: Entity,
  f: Field,
  how: Sexp,
): Result<Derivation, Diags> =>
  pipe(
    scopeWithPaths(
      m,
      [entityRoot(e.name, e.name)],
      fieldScope(e),
    )(how),
    chainResult((scope: Scope) =>
      ctx.checkExpr(how, scope),
    ),
    chainResult(
      (
        checked: TypedExpr,
      ): Result<Derivation, Diags> =>
        !isAssignable(f.type)(
          typedExprType(checked),
        )
          ? err([
              semMismatch(
                codeTypeMismatch,
                `the derivation produces ${formatSemType(typedExprType(checked))} but the field is ${formatSemType(f.type)}`,
                sexpRange(how),
                formatSemType(f.type),
                formatSemType(
                  typedExprType(checked),
                ),
              ),
            ])
          : ok(
              exprDerivation(
                checked,
                exprDepsOf(m, e, how),
                sexpRange(how),
              ),
            ),
    ),
  );

/**
 * The scope of an entity's own fields (plain names).
 */
const fieldScope = (e: Entity): Scope =>
  rootScope(
    e.fields.map((f): Binding =>
      binding(
        "field",
        f.name,
        some(f.type),
        f.range,
      ),
    ),
  );

/**
 * The dependencies a plain derivation expression
 * references: sibling fields by name and dotted
 * paths' terminal fields.
 */
const exprDepsOf = (
  m: Module,
  e: Entity,
  how: Sexp,
): ReadonlyArray<Dep> =>
  symbolNamesIn(how)
    .filter(
      (name, i, all) => all.indexOf(name) === i,
    )
    .flatMap((name): ReadonlyArray<Dep> =>
      !name.includes(".")
        ? fieldOf(e, name).map(() =>
            fieldDep(e.name, name),
          )
        : pipe(
            resolvePath(m, [
              entityRoot(e.name, e.name),
            ])(name, sexpRange(how)),
            (r): ReadonlyArray<Dep> =>
              r.__tag === "Ok" &&
              isValueTerminal(r.content.terminal)
                ? [
                    fieldDep(
                      r.content.prefixes
                        .slice(-1)
                        .map((p) => p.entity)
                        .reduce(
                          (_, target) => target,
                          e.name,
                        ),
                      lastSegment(name),
                    ),
                  ]
                : [],
          ),
    );

/**
 * Every symbol name in an expression tree (argument
 * positions only).
 */
const symbolNamesIn = (
  exp: Sexp,
): ReadonlyArray<SoftStr> =>
  isSymbolExp(exp)
    ? [exp.content.name]
    : isListExp(exp)
      ? exp.content.items
          .slice(1)
          .flatMap(symbolNamesIn)
      : [];

/**
 * The last segment of a dotted path.
 */
const lastSegment = (text: SoftStr): SoftStr =>
  text.split(".").slice(-1).join("");
