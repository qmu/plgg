import {
  SoftStr,
  Result,
  Option,
  ok,
  err,
  some,
  none,
  pipe,
} from "plgg";
import {
  Sexp,
  ListExp,
  SourceRange,
} from "plgg-ir-syntax";
import {
  SemType,
  isAssignable,
  formatSemType,
} from "plgg-ir-language/domain/model/SemType";
import {
  SemDiagnostic,
  semMismatch,
  codeArityMismatch,
  codeTypeMismatch,
} from "plgg-ir-language/domain/model/SemDiagnostic";
import {
  Binding,
  Scope,
} from "plgg-ir-language/domain/model/Scope";
import { TypedExpr } from "plgg-ir-language/domain/model/TypedExpr";

/**
 * An operator's typing rule: given the (already
 * checked) operand types and the application's range,
 * either the result type or the mismatch diagnostics.
 * A closed function, not a unification engine — a
 * polymorphic rule (`Money<C> × Percentage →
 * Money<C>`) is written as plain branching (design.md
 * §8, §23).
 */
export type OperatorCheck = (
  args: ReadonlyArray<SemType>,
  range: SourceRange,
) => Result<
  SemType,
  ReadonlyArray<SemDiagnostic>
>;

/**
 * One registered operator of a dialect's closed
 * vocabulary: unknown operators are compile errors
 * (design.md §36.3).
 */
export type OperatorDef = Readonly<{
  name: SoftStr;
  check: OperatorCheck;
}>;

/**
 * Builds an {@link OperatorDef}.
 */
export const defineOperator = (
  name: SoftStr,
  check: OperatorCheck,
): OperatorDef => ({ name, check });

/**
 * The common {@link OperatorCheck}: a fixed parameter
 * list and result type. Verifies arity, then every
 * operand's assignability, accumulating ALL mismatches
 * with expected/actual context.
 */
export const fixedSignature =
  (
    parameters: ReadonlyArray<SemType>,
    result: SemType,
  ): OperatorCheck =>
  (args, range) =>
    args.length !== parameters.length
      ? err([
          semMismatch(
            codeArityMismatch,
            `expected ${parameters.length} operand(s) but found ${args.length}`,
            range,
            String(parameters.length),
            String(args.length),
          ),
        ])
      : pipe(
          parameters.flatMap((expected, i) =>
            args
              .slice(i, i + 1)
              .filter(
                (actual) =>
                  !isAssignable(expected)(actual),
              )
              .map((actual): SemDiagnostic =>
                semMismatch(
                  codeTypeMismatch,
                  `operand ${i + 1}: expected ${formatSemType(expected)} but found ${formatSemType(actual)}`,
                  range,
                  formatSemType(expected),
                  formatSemType(actual),
                ),
              ),
          ),
          (
            mismatches: ReadonlyArray<SemDiagnostic>,
          ): Result<
            SemType,
            ReadonlyArray<SemDiagnostic>
          > =>
            mismatches.length === 0
              ? ok(result)
              : err(mismatches),
        );

/**
 * One registered form of a dialect's closed
 * vocabulary. Analysis is two-phase so forward
 * references work (an entity may target one declared
 * later): `declare` (pass 1) yields the bindings the
 * form contributes to the root scope; `analyze`
 * (pass 2) runs with the full scope and produces the
 * dialect's node.
 */
export type FormDef<N> = Readonly<{
  name: SoftStr;
  declare: (
    form: ListExp,
  ) => Result<
    ReadonlyArray<Binding>,
    ReadonlyArray<SemDiagnostic>
  >;
  analyze: (
    form: ListExp,
    ctx: AnalysisContext<N>,
  ) => Result<N, ReadonlyArray<SemDiagnostic>>;
}>;

/**
 * The `declare` of a form that binds nothing.
 */
export const declaresNothing = (): Result<
  ReadonlyArray<Binding>,
  ReadonlyArray<SemDiagnostic>
> => ok([]);

/**
 * What a form's `analyze` sees: the current scope, the
 * whole composed language, and the two recursion seams
 * — expression checking and nested-form analysis.
 */
export type AnalysisContext<N> = Readonly<{
  scope: Scope;
  language: Language<N>;
  checkExpr: (
    exp: Sexp,
    scope: Scope,
  ) => Result<
    TypedExpr,
    ReadonlyArray<SemDiagnostic>
  >;
  analyzeForm: (
    exp: Sexp,
    scope: Scope,
  ) => Result<N, ReadonlyArray<SemDiagnostic>>;
}>;

/**
 * One shorthand expander: rewrites a
 * `(name ...)` list into its explicit form before
 * analysis (design.md §33 — `(email-field email)` →
 * the full `(field email ...)`).
 */
export type Expander = Readonly<{
  name: SoftStr;
  apply: (
    form: ListExp,
  ) => Result<Sexp, ReadonlyArray<SemDiagnostic>>;
}>;

/**
 * One normalization rule: a total, deterministic
 * `Sexp → Sexp` rewrite (stable ordering, explicit
 * defaults). The composed normalizer must be
 * idempotent — property-tested per dialect.
 */
export type Normalizer = Readonly<{
  name: SoftStr;
  apply: (exp: Sexp) => Sexp;
}>;

/**
 * A dialect: one statically registered vocabulary
 * slice (forms, operators, expanders, normalizers) —
 * design.md §24. Dialects compose into a
 * {@link Language}; nothing is ever evaluated
 * dynamically.
 */
export type Dialect<N> = Readonly<{
  name: SoftStr;
  forms: ReadonlyArray<FormDef<N>>;
  operators: ReadonlyArray<OperatorDef>;
  expanders: ReadonlyArray<Expander>;
  normalizers: ReadonlyArray<Normalizer>;
}>;

/**
 * A composed language: the union of its dialects'
 * registries, collision-checked by `compose`.
 */
export type Language<N> = Readonly<{
  forms: ReadonlyArray<FormDef<N>>;
  operators: ReadonlyArray<OperatorDef>;
  expanders: ReadonlyArray<Expander>;
  normalizers: ReadonlyArray<Normalizer>;
}>;

/**
 * Looks up a form by name.
 */
export const findForm = <N>(
  language: Language<N>,
  name: SoftStr,
): Option<FormDef<N>> =>
  firstOf(
    language.forms.filter((f) => f.name === name),
  );

/**
 * Looks up an operator by name.
 */
export const findOperator = <N>(
  language: Language<N>,
  name: SoftStr,
): Option<OperatorDef> =>
  firstOf(
    language.operators.filter(
      (o) => o.name === name,
    ),
  );

/**
 * Looks up an expander by name.
 */
export const findExpander = <N>(
  language: Language<N>,
  name: SoftStr,
): Option<Expander> =>
  firstOf(
    language.expanders.filter(
      (e) => e.name === name,
    ),
  );

/**
 * The first element of an array as an `Option`.
 */
const firstOf = <A>(
  items: ReadonlyArray<A>,
): Option<A> =>
  items
    .slice(0, 1)
    .reduce<Option<A>>((_, v) => some(v), none());
