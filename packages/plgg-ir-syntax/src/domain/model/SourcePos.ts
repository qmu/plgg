/**
 * One point in a source text: the absolute character
 * `offset` (0-based) plus the human-facing `line` and
 * `column` (both 1-based, the convention editors and
 * LLM-correction loops expect). Offsets are what the
 * parser computes with; line/column are derived once
 * from a {@link LineIndex} so every consumer reads the
 * same coordinates.
 */
export type SourcePos = Readonly<{
  offset: number;
  line: number;
  column: number;
}>;

/**
 * Builds a {@link SourcePos}.
 */
export const sourcePos = (
  offset: number,
  line: number,
  column: number,
): SourcePos => ({ offset, line, column });
