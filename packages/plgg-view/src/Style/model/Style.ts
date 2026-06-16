import { SoftStr } from "plgg";

/**
 * One CSS declaration as pure data — the atom of the inline-style system. A
 * utility produces one or more of these; {@link style_} folds them into a single
 * `style="…"` attribute. Pure and SSR-safe (no DOM, no class names, no
 * stylesheet).
 */
export type Style = Readonly<{
  prop: SoftStr;
  value: SoftStr;
}>;

/**
 * What every utility returns: an ordered list of {@link Style} declarations
 * (a single-property utility returns one; a shorthand like `px` returns two).
 */
export type Styles = ReadonlyArray<Style>;

/** Builds a one-declaration {@link Styles}. */
export const decl = (
  prop: SoftStr,
  value: SoftStr,
): Styles => [{ prop, value }];
