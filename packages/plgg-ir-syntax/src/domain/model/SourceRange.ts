import { SourcePos } from "plgg-ir-syntax/domain/model/SourcePos";

/**
 * A half-open span of source text: `start` inclusive,
 * `end` exclusive — the shape every syntax node and
 * diagnostic carries so a consumer (or an LLM
 * correction loop) can point back at the exact
 * characters that produced it.
 */
export type SourceRange = Readonly<{
  start: SourcePos;
  end: SourcePos;
}>;

/**
 * Builds a {@link SourceRange}.
 */
export const sourceRange = (
  start: SourcePos,
  end: SourcePos,
): SourceRange => ({ start, end });
