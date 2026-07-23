import {
  SoftStr,
  Option,
  some,
  none,
} from "plgg";
import {
  SourceRange,
  SyntaxDiagnostic,
  DiagnosticSeverity,
} from "plgg-ir-syntax";

/**
 * A pointer to another source location that explains a
 * diagnostic (e.g. "first declared here").
 */
export type RelatedLocation = Readonly<{
  message: SoftStr;
  range: SourceRange;
}>;

/**
 * One semantic diagnostic: the family-wide error model
 * (design.md §35) extended with the expected/actual
 * context a type mismatch carries and related source
 * locations. Pure data, accumulated per pass — never a
 * throw.
 */
export type SemDiagnostic = Readonly<{
  code: SoftStr;
  severity: DiagnosticSeverity;
  message: SoftStr;
  range: SourceRange;
  expected: Option<SoftStr>;
  actual: Option<SoftStr>;
  related: ReadonlyArray<RelatedLocation>;
}>;

/**
 * Builds an error-severity {@link SemDiagnostic}
 * without expected/actual context.
 */
export const semError = (
  code: SoftStr,
  message: SoftStr,
  range: SourceRange,
): SemDiagnostic => ({
  code,
  severity: "error",
  message,
  range,
  expected: none(),
  actual: none(),
  related: [],
});

/**
 * Builds an error-severity {@link SemDiagnostic}
 * carrying expected/actual context (type and arity
 * mismatches).
 */
export const semMismatch = (
  code: SoftStr,
  message: SoftStr,
  range: SourceRange,
  expected: SoftStr,
  actual: SoftStr,
): SemDiagnostic => ({
  code,
  severity: "error",
  message,
  range,
  expected: some(expected),
  actual: some(actual),
  related: [],
});

/**
 * Attaches related locations to a diagnostic.
 */
export const withRelated =
  (related: ReadonlyArray<RelatedLocation>) =>
  (d: SemDiagnostic): SemDiagnostic => ({
    ...d,
    related,
  });

/**
 * Lifts a syntax-layer diagnostic into the semantic
 * shape, so one pipeline reports one diagnostic list.
 */
export const fromSyntaxDiagnostic = (
  d: SyntaxDiagnostic,
): SemDiagnostic => ({
  code: d.code,
  severity: d.severity,
  message: d.message,
  range: d.range,
  expected: none(),
  actual: none(),
  related: [],
});

/**
 * A top-level or nested form is not a
 * `(head-symbol ...)` list.
 */
export const codeInvalidForm =
  "language.invalid-form";

/**
 * A form head names no registered form (closed
 * vocabulary, design.md §36.3).
 */
export const codeUnknownForm =
  "language.unknown-form";

/**
 * An expression head names no registered operator.
 */
export const codeUnknownOperator =
  "language.unknown-operator";

/**
 * A referenced name resolves to no binding in scope.
 */
export const codeUnknownName =
  "language.unknown-name";

/**
 * The same kind+name is declared twice.
 */
export const codeDuplicateName =
  "language.duplicate-name";

/**
 * An operator was applied to the wrong number of
 * operands.
 */
export const codeArityMismatch =
  "language.arity-mismatch";

/**
 * An operand or expression has the wrong type.
 */
export const codeTypeMismatch =
  "language.type-mismatch";

/**
 * An expression position holds something that is not
 * an expression (e.g. a list without a symbol head).
 */
export const codeInvalidExpression =
  "language.invalid-expression";

/**
 * A reference names a binding that carries no value
 * type, so it cannot appear in an expression.
 */
export const codeUntypedReference =
  "language.untyped-reference";

/**
 * Shorthand expansion did not terminate within the
 * depth bound (a self-producing expander).
 */
export const codeExpansionDepth =
  "language.expansion-depth";
