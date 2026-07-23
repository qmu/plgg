import { SoftStr } from "plgg";
import {
  SourcePos,
  sourcePos,
} from "plgg-ir-syntax/domain/model/SourcePos";
import {
  SourceRange,
  sourceRange,
} from "plgg-ir-syntax/domain/model/SourceRange";

/**
 * The start offset of every line in a source text
 * (line 1 starts at offset 0). Built once per parse so
 * offset→line/column conversion is a lookup, not a
 * rescan of the source.
 */
export type LineIndex = ReadonlyArray<number>;

/**
 * Builds the {@link LineIndex} of `source`: offset 0
 * plus the offset after every newline.
 */
export const buildLineIndex = (
  source: SoftStr,
): LineIndex =>
  [...source].reduce<ReadonlyArray<number>>(
    (starts, ch, i) =>
      ch === "\n" ? [...starts, i + 1] : starts,
    [0],
  );

/**
 * Converts an absolute character `offset` into a
 * {@link SourcePos} using a {@link LineIndex}. The line
 * is the last line start at or before the offset; the
 * column is the 1-based distance from it.
 */
export const posAt =
  (index: LineIndex) =>
  (offset: number): SourcePos =>
    index
      .filter((start) => start <= offset)
      .reduce(
        (_, start, i): SourcePos =>
          sourcePos(
            offset,
            i + 1,
            offset - start + 1,
          ),
        sourcePos(offset, 1, offset + 1),
      );

/**
 * Converts a half-open offset pair into a
 * {@link SourceRange} using a {@link LineIndex}.
 */
export const rangeAt =
  (index: LineIndex) =>
  (start: number, end: number): SourceRange =>
    sourceRange(
      posAt(index)(start),
      posAt(index)(end),
    );
