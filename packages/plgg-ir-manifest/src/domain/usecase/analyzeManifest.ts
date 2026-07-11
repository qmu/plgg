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
  SourceRange,
  isListExp,
  isSymbolExp,
  sexpRange,
} from "plgg-ir-syntax";
import {
  SemType,
  SemDiagnostic,
  TypedExpr,
  Binding,
  Scope,
  FormDef,
  AnalysisContext,
  binding,
  childScope,
  booleanType,
  integerType,
  decimalType,
  stringType,
  dateType,
  nominalType,
  paramType,
  semTypeEquals,
  formatSemType,
  semError,
  semMismatch,
  withRelated,
  typedExprType,
  allOrErrors,
  partitionResults,
} from "plgg-ir-language";
import {
  codeBadRoot,
  codeUnsupportedVersion,
  codeBadModule,
  codeUnknownModuleForm,
  codeBadEntity,
  codeUnknownEntityForm,
  codeDuplicateMember,
  codeBadField,
  codeUnknownFieldForm,
  codeBadValidation,
  codeBadRelation,
  codeBadAggregate,
  codeNonBooleanCondition,
} from "plgg-ir-manifest/domain/model/ManifestCode";
import {
  Field,
  ValidationRule,
  field,
  requiredRule,
  maxLengthRule,
  lengthBetweenRule,
  requiredWhenRule,
} from "plgg-ir-manifest/domain/model/Field";
import {
  Relation,
  Cardinality,
  relation,
} from "plgg-ir-manifest/domain/model/Relation";
import {
  Entity,
  entity,
} from "plgg-ir-manifest/domain/model/Entity";
import {
  Aggregate,
  Consistency,
  aggregate,
} from "plgg-ir-manifest/domain/model/Aggregate";
import {
  Module,
  IR_VERSION,
  module_,
} from "plgg-ir-manifest/domain/model/Module";
import {
  isClause,
  hasHead,
  clausesNamed,
  childrenOf,
  symbolArg,
  numberArg,
  exprArg,
} from "plgg-ir-manifest/domain/usecase/clause";
import { verifyModule } from "plgg-ir-manifest/domain/usecase/verifyModule";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * Maps a `(type ...)` argument to a semantic type:
 * primitive names map to the shared primitives, any
 * other symbol is a nominal domain type, and a
 * `(name tag ...)` list is a parameterized type
 * (`(money JPY)`) — design.md §8.
 */
export const parseFieldType = (
  exp: Sexp,
): Result<SemType, Diags> =>
  isSymbolExp(exp)
    ? ok(primOrNominal(exp.content.name))
    : isListExp(exp) &&
        exp.content.items.every(isSymbolExp) &&
        exp.content.items.length >= 2
      ? ok(
          paramType(
            exp.content.items
              .filter(isSymbolExp)
              .slice(0, 1)
              .map((s) => s.content.name)
              .join(""),
            exp.content.items
              .filter(isSymbolExp)
              .slice(1)
              .map((s) => s.content.name),
          ),
        )
      : err([
          semError(
            codeBadField,
            "a field type must be a symbol or a (name tag ...) list of symbols",
            sexpRange(exp),
          ),
        ]);

/**
 * The shared primitives by name; anything else is
 * nominal.
 */
const primOrNominal = (name: SoftStr): SemType =>
  name === "boolean"
    ? booleanType
    : name === "integer"
      ? integerType
      : name === "decimal"
        ? decimalType
        : name === "string"
          ? stringType
          : name === "date"
            ? dateType
            : nominalType(name);

/**
 * Checks a manifest condition expression and requires
 * it to type to boolean
 * (`manifest.expression.non-boolean` otherwise).
 */
const checkBooleanExpr = (
  ctx: AnalysisContext<Module>,
  scope: Scope,
  exp: Sexp,
): Result<TypedExpr, Diags> =>
  pipe(
    ctx.checkExpr(exp, scope),
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
 * A structurally parsed field, before its validation
 * conditions can be checked (those need the whole
 * entity's field scope).
 */
type FieldDecl = Readonly<{
  name: SymbolExp;
  type: SemType;
  column: Option<SoftStr>;
  validateClauses: ReadonlyArray<ListExp>;
  form: ListExp;
}>;

/**
 * Parses `(field <name> (type t) [(column c)]
 * [(validate ...)])` structurally. Unknown clauses are
 * compile errors (closed vocabulary, design.md §34).
 */
const parseFieldDecl = (
  form: ListExp,
): Result<FieldDecl, Diags> =>
  pipe(
    symbolArg(form, 1),
    matchOption(
      (): Result<FieldDecl, Diags> =>
        err([
          semError(
            codeBadField,
            "a field needs (field <name> ...)",
            form.content.range,
          ),
        ]),
      (name: SymbolExp) =>
        pipe(
          allOrErrors(
            childrenOf(form)
              .slice(1)
              .map(
                (
                  child: Sexp,
                ): Result<true, Diags> =>
                  isClause("type")(child) ||
                  isClause("column")(child) ||
                  isClause("validate")(child)
                    ? ok(true)
                    : err([
                        semError(
                          codeUnknownFieldForm,
                          "a field clause must be (type ...), (column ...), or (validate ...)",
                          sexpRange(child),
                        ),
                      ]),
              ),
          ),
          chainResult(() =>
            pipe(
              clausesNamed(form, "type"),
              (types) =>
                types.length !== 1
                  ? err([
                      semError(
                        codeBadField,
                        `a field needs exactly one (type ...) clause, found ${types.length}`,
                        form.content.range,
                      ),
                    ])
                  : pipe(
                      types.flatMap((t) =>
                        pipe(
                          exprArg(t, 1),
                          matchOption(
                            (): ReadonlyArray<
                              Result<
                                SemType,
                                Diags
                              >
                            > => [
                              err([
                                semError(
                                  codeBadField,
                                  "(type ...) needs an argument",
                                  t.content.range,
                                ),
                              ]),
                            ],
                            (arg: Sexp) => [
                              parseFieldType(arg),
                            ],
                          ),
                        ),
                      ),
                      allOrErrors,
                      mapResult(
                        (
                          parsed: ReadonlyArray<SemType>,
                        ): FieldDecl => ({
                          name,
                          type: parsed
                            .slice(0, 1)
                            .reduce<SemType>(
                              (_, t) => t,
                              stringType,
                            ),
                          column: columnOf(form),
                          validateClauses:
                            clausesNamed(
                              form,
                              "validate",
                            ),
                          form,
                        }),
                      ),
                    ),
            ),
          ),
        ),
    ),
  );

/**
 * The `(column c)` argument of a field, when present.
 */
const columnOf = (
  form: ListExp,
): Option<SoftStr> =>
  clausesNamed(form, "column")
    .flatMap((c) =>
      pipe(
        symbolArg(c, 1),
        matchOption(
          (): ReadonlyArray<SoftStr> => [],
          (s: SymbolExp) => [s.content.name],
        ),
      ),
    )
    .reduce<Option<SoftStr>>(
      (_, name) => some(name),
      none(),
    );

/**
 * Parses one rule inside `(validate ...)` against the
 * closed rule vocabulary (design.md §9), checking a
 * `required-when` condition in the entity scope.
 */
const parseValidationRule =
  (ctx: AnalysisContext<Module>, scope: Scope) =>
  (exp: Sexp): Result<ValidationRule, Diags> =>
    !isListExp(exp)
      ? err([
          semError(
            codeBadValidation,
            "a validation rule must be a (rule ...) list",
            sexpRange(exp),
          ),
        ])
      : hasHead("required")(exp)
        ? ok(requiredRule(exp.content.range))
        : hasHead("max-length")(exp)
          ? pipe(
              numberArg(exp, 1),
              matchOption(
                (): Result<
                  ValidationRule,
                  Diags
                > =>
                  err([
                    semError(
                      codeBadValidation,
                      "(max-length ...) needs a number",
                      exp.content.range,
                    ),
                  ]),
                (n) =>
                  ok(
                    maxLengthRule(
                      n.content.value,
                      exp.content.range,
                    ),
                  ),
              ),
            )
          : hasHead("length-between")(exp)
            ? pipe(
                numberArg(exp, 1),
                matchOption(
                  (): Result<
                    ValidationRule,
                    Diags
                  > =>
                    err([
                      semError(
                        codeBadValidation,
                        "(length-between ...) needs two numbers",
                        exp.content.range,
                      ),
                    ]),
                  (min) =>
                    pipe(
                      numberArg(exp, 2),
                      matchOption(
                        (): Result<
                          ValidationRule,
                          Diags
                        > =>
                          err([
                            semError(
                              codeBadValidation,
                              "(length-between ...) needs two numbers",
                              exp.content.range,
                            ),
                          ]),
                        (max) =>
                          ok(
                            lengthBetweenRule(
                              min.content.value,
                              max.content.value,
                              exp.content.range,
                            ),
                          ),
                      ),
                    ),
                ),
              )
            : hasHead("required-when")(exp)
              ? pipe(
                  exprArg(exp, 1),
                  matchOption(
                    (): Result<
                      ValidationRule,
                      Diags
                    > =>
                      err([
                        semError(
                          codeBadValidation,
                          "(required-when ...) needs a condition",
                          exp.content.range,
                        ),
                      ]),
                    (condition: Sexp) =>
                      pipe(
                        checkBooleanExpr(
                          ctx,
                          scope,
                          condition,
                        ),
                        mapResult((e) =>
                          requiredWhenRule(
                            e,
                            exp.content.range,
                          ),
                        ),
                      ),
                  ),
                )
              : err([
                  semError(
                    codeBadValidation,
                    "unknown validation rule",
                    exp.content.range,
                  ),
                ]);

/**
 * Parses `(relation <name> (target t)
 * (cardinality one|many) [(required)]
 * [(inverse i)])`.
 */
const parseRelation = (
  form: ListExp,
): Result<Relation, Diags> =>
  pipe(
    symbolArg(form, 1),
    matchOption(
      (): Result<Relation, Diags> =>
        err([
          semError(
            codeBadRelation,
            "a relation needs (relation <name> ...)",
            form.content.range,
          ),
        ]),
      (name: SymbolExp) =>
        pipe(
          clausesNamed(form, "target").flatMap(
            (t) =>
              pipe(
                symbolArg(t, 1),
                matchOption(
                  (): ReadonlyArray<SymbolExp> => [],
                  (s: SymbolExp) => [s],
                ),
              ),
          ),
          (targets) =>
            pipe(
              clausesNamed(
                form,
                "cardinality",
              ).flatMap((c) =>
                pipe(
                  symbolArg(c, 1),
                  matchOption(
                    (): ReadonlyArray<SymbolExp> => [],
                    (s: SymbolExp) => [s],
                  ),
                ),
              ),
              (cardinalities) =>
                targets.length !== 1 ||
                cardinalities.length !== 1 ||
                !cardinalities.every(
                  (c) =>
                    c.content.name === "one" ||
                    c.content.name === "many",
                )
                  ? err([
                      semError(
                        codeBadRelation,
                        "a relation needs exactly one (target <entity>) and one (cardinality one|many)",
                        form.content.range,
                      ),
                    ])
                  : ok(
                      relation(
                        name.content.name,
                        targets
                          .map(
                            (t) => t.content.name,
                          )
                          .join(""),
                        cardinalityOf(
                          cardinalities,
                        ),
                        clausesNamed(
                          form,
                          "required",
                        ).length > 0,
                        inverseOf(form),
                        form.content.range,
                        targets
                          .map(
                            (t) =>
                              t.content.range,
                          )
                          .reduce(
                            (_, r) => r,
                            form.content.range,
                          ),
                      ),
                    ),
            ),
        ),
    ),
  );

/**
 * Folds a verified single-element cardinality symbol
 * list to its value.
 */
const cardinalityOf = (
  cardinalities: ReadonlyArray<SymbolExp>,
): Cardinality =>
  cardinalities.every(
    (c) => c.content.name === "one",
  )
    ? "one"
    : "many";

/**
 * The `(inverse i)` argument, when present.
 */
const inverseOf = (
  form: ListExp,
): Option<SoftStr> =>
  clausesNamed(form, "inverse")
    .flatMap((c) =>
      pipe(
        symbolArg(c, 1),
        matchOption(
          (): ReadonlyArray<SoftStr> => [],
          (s: SymbolExp) => [s.content.name],
        ),
      ),
    )
    .reduce<Option<SoftStr>>(
      (_, name) => some(name),
      none(),
    );

/**
 * Parses `(aggregate <name> (root r)
 * (members m ...) [(consistency
 * immediate|eventual)])`.
 */
const parseAggregate = (
  form: ListExp,
): Result<Aggregate, Diags> =>
  pipe(
    symbolArg(form, 1),
    matchOption(
      (): Result<Aggregate, Diags> =>
        err([
          semError(
            codeBadAggregate,
            "an aggregate needs (aggregate <name> ...)",
            form.content.range,
          ),
        ]),
      (name: SymbolExp) =>
        pipe(
          clausesNamed(form, "root").flatMap(
            (r) =>
              pipe(
                symbolArg(r, 1),
                matchOption(
                  (): ReadonlyArray<SymbolExp> => [],
                  (s: SymbolExp) => [s],
                ),
              ),
          ),
          (roots) =>
            roots.length !== 1
              ? err([
                  semError(
                    codeBadAggregate,
                    "an aggregate needs exactly one (root <entity>)",
                    form.content.range,
                  ),
                ])
              : pipe(
                  clausesNamed(
                    form,
                    "members",
                  ).flatMap((m) =>
                    childrenOf(m).filter(
                      isSymbolExp,
                    ),
                  ),
                  (members) =>
                    pipe(
                      consistencyOf(form),
                      chainResult(
                        (
                          consistency: Option<Consistency>,
                        ) =>
                          ok(
                            aggregate(
                              name.content.name,
                              roots
                                .map(
                                  (r) =>
                                    r.content
                                      .name,
                                )
                                .join(""),
                              members.map(
                                (m) =>
                                  m.content.name,
                              ),
                              consistency,
                              form.content.range,
                              roots
                                .map(
                                  (r) =>
                                    r.content
                                      .range,
                                )
                                .reduce(
                                  (_, r) => r,
                                  form.content
                                    .range,
                                ),
                              members.map(
                                (m) =>
                                  m.content.range,
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
 * The `(consistency ...)` declaration, when present —
 * its argument must be `immediate` or `eventual`.
 */
const consistencyOf = (
  form: ListExp,
): Result<Option<Consistency>, Diags> =>
  pipe(
    clausesNamed(form, "consistency").flatMap(
      (c) =>
        pipe(
          symbolArg(c, 1),
          matchOption(
            (): ReadonlyArray<SymbolExp> => [],
            (s: SymbolExp) => [s],
          ),
        ),
    ),
    (declared) =>
      declared.every(
        (s) =>
          s.content.name === "immediate" ||
          s.content.name === "eventual",
      )
        ? ok(
            declared.reduce<Option<Consistency>>(
              (_, s) =>
                s.content.name === "immediate"
                  ? some("immediate")
                  : some("eventual"),
              none(),
            ),
          )
        : err([
            semError(
              codeBadAggregate,
              "(consistency ...) must be immediate or eventual",
              form.content.range,
            ),
          ]),
  );

/**
 * Diagnoses duplicate field/relation names within one
 * entity, pointing back at the first declaration.
 */
const duplicateMembers = (
  named: ReadonlyArray<
    Readonly<{
      name: SoftStr;
      range: SourceRange;
    }>
  >,
): Diags =>
  named.flatMap((m, i) =>
    named
      .slice(0, i)
      .filter((seen) => seen.name === m.name)
      .slice(0, 1)
      .map((first) =>
        pipe(
          semError(
            codeDuplicateMember,
            `duplicate member name ${JSON.stringify(m.name)}`,
            m.range,
          ),
          withRelated([
            {
              message: "first declared here",
              range: first.range,
            },
          ]),
        ),
      ),
  );

/**
 * Analyzes `(entity <name> [(table t)] (field ...)*
 * (relation ...)* (invariant ...)*)`: fields and
 * relations parse structurally first, then the
 * entity's field scope is built so validation
 * conditions and invariants type-check against
 * sibling fields (design.md §9).
 */
const analyzeEntity =
  (ctx: AnalysisContext<Module>) =>
  (form: ListExp): Result<Entity, Diags> =>
    pipe(
      symbolArg(form, 1),
      matchOption(
        (): Result<Entity, Diags> =>
          err([
            semError(
              codeBadEntity,
              "an entity needs (entity <name> ...)",
              form.content.range,
            ),
          ]),
        (name: SymbolExp) =>
          pipe(
            allOrErrors(
              childrenOf(form)
                .slice(1)
                .map(
                  (
                    child: Sexp,
                  ): Result<true, Diags> =>
                    isClause("field")(child) ||
                    isClause("relation")(child) ||
                    isClause("invariant")(
                      child,
                    ) ||
                    isClause("table")(child)
                      ? ok(true)
                      : err([
                          semError(
                            codeUnknownEntityForm,
                            "an entity clause must be (table ...), (field ...), (relation ...), or (invariant ...)",
                            sexpRange(child),
                          ),
                        ]),
                ),
            ),
            chainResult(() =>
              buildEntity(ctx, form, name),
            ),
          ),
      ),
    );

/**
 * Builds one entity after its clause heads validated.
 */
const buildEntity = (
  ctx: AnalysisContext<Module>,
  form: ListExp,
  name: SymbolExp,
): Result<Entity, Diags> =>
  pipe(
    allOrErrors(
      clausesNamed(form, "field").map(
        parseFieldDecl,
      ),
    ),
    chainResult(
      (decls: ReadonlyArray<FieldDecl>) =>
        pipe(
          allOrErrors(
            clausesNamed(form, "relation").map(
              parseRelation,
            ),
          ),
          chainResult(
            (
              relations: ReadonlyArray<Relation>,
            ) =>
              pipe(
                duplicateMembers([
                  ...decls.map((d) => ({
                    name: d.name.content.name,
                    range: d.name.content.range,
                  })),
                  ...relations.map((r) => ({
                    name: r.name,
                    range: r.range,
                  })),
                ]),
                (dups: Diags) =>
                  dups.length > 0
                    ? err(dups)
                    : finishEntity(
                        ctx,
                        form,
                        name,
                        decls,
                        relations,
                      ),
              ),
          ),
        ),
    ),
  );

/**
 * Finishes an entity: builds the field scope, checks
 * every validation condition and invariant in it, and
 * assembles the IR node.
 */
const finishEntity = (
  ctx: AnalysisContext<Module>,
  form: ListExp,
  name: SymbolExp,
  decls: ReadonlyArray<FieldDecl>,
  relations: ReadonlyArray<Relation>,
): Result<Entity, Diags> =>
  pipe(
    childScope(ctx.scope)(
      decls.map((d): Binding =>
        binding(
          "field",
          d.name.content.name,
          some(d.type),
          d.name.content.range,
        ),
      ),
    ),
    (scope: Scope) =>
      pipe(
        allOrErrors(
          decls.map((d) =>
            pipe(
              allOrErrors(
                d.validateClauses
                  .flatMap(childrenOf)
                  .map(
                    parseValidationRule(
                      ctx,
                      scope,
                    ),
                  ),
              ),
              mapResult(
                (
                  validations: ReadonlyArray<ValidationRule>,
                ): Field =>
                  field(
                    d.name.content.name,
                    d.type,
                    d.column,
                    validations,
                    d.form.content.range,
                  ),
              ),
            ),
          ),
        ),
        chainResult(
          (fields: ReadonlyArray<Field>) =>
            pipe(
              allOrErrors(
                clausesNamed(
                  form,
                  "invariant",
                ).map((inv) =>
                  pipe(
                    exprArg(inv, 1),
                    matchOption(
                      (): Result<
                        TypedExpr,
                        Diags
                      > =>
                        err([
                          semError(
                            codeBadEntity,
                            "(invariant ...) needs a condition",
                            inv.content.range,
                          ),
                        ]),
                      (condition: Sexp) =>
                        checkBooleanExpr(
                          ctx,
                          scope,
                          condition,
                        ),
                    ),
                  ),
                ),
              ),
              mapResult(
                (
                  invariants: ReadonlyArray<TypedExpr>,
                ): Entity =>
                  entity(
                    name.content.name,
                    tableOf(form),
                    fields,
                    relations,
                    invariants,
                    form.content.range,
                  ),
              ),
            ),
        ),
      ),
  );

/**
 * The `(table t)` argument of an entity, when present.
 */
const tableOf = (
  form: ListExp,
): Option<SoftStr> =>
  clausesNamed(form, "table")
    .flatMap((c) =>
      pipe(
        symbolArg(c, 1),
        matchOption(
          (): ReadonlyArray<SoftStr> => [],
          (s: SymbolExp) => [s.content.name],
        ),
      ),
    )
    .reduce<Option<SoftStr>>(
      (_, name) => some(name),
      none(),
    );

/**
 * Collects the entity bindings a `(plgg-ir ...)` form
 * declares — the framework's pass 1, best-effort:
 * structural problems are reported by `analyze`, not
 * here, so nothing is diagnosed twice.
 */
const collectEntityBindings = (
  form: ListExp,
): ReadonlyArray<Binding> =>
  childrenOf(form)
    .filter(isClause("module"))
    .flatMap(childrenOf)
    .filter(isClause("entity"))
    .flatMap((e) =>
      pipe(
        symbolArg(e, 1),
        matchOption(
          (): ReadonlyArray<Binding> => [],
          (name: SymbolExp) => [
            binding(
              "entity",
              name.content.name,
              none(),
              name.content.range,
            ),
          ],
        ),
      ),
    );

/**
 * The `plgg-ir` form — the Domain Manifest dialect's
 * single top-level form:
 * `(plgg-ir 1 (module <name> <entity|aggregate>...))`.
 * Analysis parses the module, then runs the structural
 * verification passes (relations, inverses,
 * aggregates — design.md §16.5–16.6) over the built
 * model, accumulating every diagnostic.
 */
export const plggIrForm: FormDef<Module> = {
  name: "plgg-ir",
  declare: (form) =>
    ok(collectEntityBindings(form)),
  analyze: (form, ctx) =>
    pipe(
      numberArg(form, 1),
      matchOption(
        (): Result<Module, Diags> =>
          err([
            semError(
              codeBadRoot,
              "the root must be (plgg-ir <version> (module ...))",
              form.content.range,
            ),
          ]),
        (version) =>
          version.content.value !== IR_VERSION
            ? err([
                semError(
                  codeUnsupportedVersion,
                  `unsupported plgg-ir version ${version.content.value} (supported: ${IR_VERSION})`,
                  version.content.range,
                ),
              ])
            : analyzeModule(ctx, form),
      ),
    ),
};

/**
 * Analyzes the `(module <name> ...)` child of the
 * root form, then verifies the whole model.
 */
const analyzeModule = (
  ctx: AnalysisContext<Module>,
  root: ListExp,
): Result<Module, Diags> =>
  pipe(childrenOf(root).slice(1), (children) =>
    children.length !== 1 ||
    !children.every(isClause("module"))
      ? err([
          semError(
            codeBadRoot,
            "the root needs exactly one (module <name> ...)",
            root.content.range,
          ),
        ])
      : children
          .filter(isClause("module"))
          .map((m) => buildModule(ctx, m))
          .reduce(
            (_, r) => r,
            err([
              semError(
                codeBadRoot,
                "the root needs exactly one (module <name> ...)",
                root.content.range,
              ),
            ]),
          ),
  );

/**
 * Builds and verifies one module.
 */
const buildModule = (
  ctx: AnalysisContext<Module>,
  form: ListExp,
): Result<Module, Diags> =>
  pipe(
    symbolArg(form, 1),
    matchOption(
      (): Result<Module, Diags> =>
        err([
          semError(
            codeBadModule,
            "a module needs (module <name> ...)",
            form.content.range,
          ),
        ]),
      (name: SymbolExp) =>
        pipe(
          partitionResults(
            childrenOf(form)
              .slice(1)
              .map(
                (
                  child: Sexp,
                ): Result<
                  Readonly<{
                    entities: ReadonlyArray<Entity>;
                    aggregates: ReadonlyArray<Aggregate>;
                  }>,
                  Diags
                > =>
                  isClause("entity")(child)
                    ? pipe(
                        analyzeEntity(ctx)(child),
                        mapResult((e) => ({
                          entities: [e],
                          aggregates: [],
                        })),
                      )
                    : isClause("aggregate")(child)
                      ? pipe(
                          parseAggregate(child),
                          mapResult((a) => ({
                            entities: [],
                            aggregates: [a],
                          })),
                        )
                      : err([
                          semError(
                            codeUnknownModuleForm,
                            "a module child must be (entity ...) or (aggregate ...)",
                            sexpRange(child),
                          ),
                        ]),
              ),
          ),
          (parts) =>
            pipe(
              module_(
                IR_VERSION,
                name.content.name,
                parts.values.flatMap(
                  (p) => p.entities,
                ),
                parts.values.flatMap(
                  (p) => p.aggregates,
                ),
                form.content.range,
              ),
              (m: Module) =>
                pipe(
                  [
                    ...parts.errors,
                    ...verifyModule(m),
                  ],
                  (all: Diags) =>
                    all.length === 0
                      ? ok(m)
                      : err(all),
                ),
            ),
        ),
    ),
  );
