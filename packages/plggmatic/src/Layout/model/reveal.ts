/** A horizontal extent in window coordinates. */
export type Span = Readonly<{
  left: number;
  right: number;
}>;

/**
 * Where a strip must be scrolled to for a column to be
 * seen, given what of the strip is visible now. One rule
 * for every column:
 *
 * - a column wider than the visible part shows its END
 *   (its right edge meets the visible right edge) — the
 *   newest content is where the reader's attention is;
 * - a column cut off on the left comes to the left edge;
 * - a column cut off on the right comes to the right edge;
 * - a column already in full view moves nothing.
 *
 * Pure, and clamped to what the strip can reach.
 */
export const revealTarget = (
  current: number,
  maximum: number,
  visible: Span,
  column: Span,
): number => {
  const delta =
    column.right - column.left >
    visible.right - visible.left
      ? column.right - visible.right
      : column.left < visible.left
        ? column.left - visible.left
        : column.right > visible.right
          ? column.right - visible.right
          : 0;
  return Math.max(
    0,
    Math.min(maximum, current + delta),
  );
};

/**
 * The glide's easing: fast at first, settling at the end
 * (ease-out cubic). `progress` runs 0 to 1.
 */
export const glideEase = (
  progress: number,
): number =>
  1 -
  Math.pow(
    1 - Math.max(0, Math.min(1, progress)),
    3,
  );
