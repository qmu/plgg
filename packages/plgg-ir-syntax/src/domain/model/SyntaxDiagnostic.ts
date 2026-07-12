import { SoftStr } from "plgg";
import { SourceRange } from "plgg-ir-syntax/domain/model/SourceRange";

/**
 * How bad a diagnostic is. `error` blocks acceptance
 * of the source; `warning` does not (the syntax layer
 * currently only emits errors, but the severity axis
 * is part of the family-wide error model from the
 * start — design.md §35).
 */
export type DiagnosticSeverity =
  "error" | "warning";

/**
 * One structured syntax diagnostic: a stable machine
 * `code`, a `severity`, a human/LLM-facing `message`,
 * and the {@link SourceRange} it points at. Pure data —
 * malformed input is a value, never a throw — shaped
 * for LLM correction loops (design.md §35).
 */
export type SyntaxDiagnostic = Readonly<{
  code: SoftStr;
  severity: DiagnosticSeverity;
  message: SoftStr;
  range: SourceRange;
}>;

/**
 * Builds an error-severity {@link SyntaxDiagnostic}.
 */
export const syntaxError = (
  code: SoftStr,
  message: SoftStr,
  range: SourceRange,
): SyntaxDiagnostic => ({
  code,
  severity: "error",
  message,
  range,
});

/**
 * A character no token can start with.
 */
export const codeUnexpectedCharacter =
  "syntax.unexpected-character";

/**
 * A string literal that never closes (EOF or a raw
 * newline before the closing quote).
 */
export const codeUnterminatedString =
  "syntax.unterminated-string";

/**
 * A `\` escape that is not part of the closed escape
 * set (`\"`, `\\`, `\n`, `\t`, `\r`).
 */
export const codeInvalidEscape =
  "syntax.invalid-escape";

/**
 * An atom that starts like a number but is not a valid
 * integer/decimal literal (e.g. `1abc`, `1.`).
 */
export const codeInvalidNumber =
  "syntax.invalid-number";

/**
 * A `(` whose list is still open at end of input.
 */
export const codeUnterminatedList =
  "syntax.unterminated-list";

/**
 * A `)` with no open list to close.
 */
export const codeUnexpectedCloseParen =
  "syntax.unexpected-close-paren";
