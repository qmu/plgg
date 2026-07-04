import { type SoftStr } from "plgg";
import {
  type Styles,
  decl,
} from "plgg-view/style";
import {
  type Color,
  colorVar,
} from "plggmatic/Style/model/token";

/**
 * plggmatic's color atoms. They mirror plgg-view's
 * `bg`/`color`/`border` utilities but resolve every color
 * through a `var(--pm-*)` custom property instead of a
 * literal hex, so one `dark` class on `<html>` reswitches
 * the scheme without re-styling a single element. Each
 * returns plgg-view `Styles` (pure `{prop, value}` data),
 * so they compose through `style_` exactly like the
 * built-in utilities — plggmatic adds theming, not a new
 * styling engine. These SHADOW the same-named plgg-view
 * utilities on the `plggmatic/style` subpath; reach for
 * these to get scheme-aware color.
 */

/** Background fill from a themed color role. */
export const bg = (c: Color): Styles =>
  decl("background-color", colorVar(c));

/** Text (foreground) color from a themed role. */
export const color = (c: Color): Styles =>
  decl("color", colorVar(c));

/**
 * Text color — the explicit spelling for the common
 * case, distinct from plgg-view's `color` so intent
 * reads at the call site. Same atom as {@link color}.
 */
export const textColor = color;

/**
 * A hairline border in the themed `border` role. Emitted
 * as three atoms (width/style/color) rather than a
 * `border` shorthand so the color stays a `var(--pm-*)`
 * reference the scheme can reswitch.
 */
export const border: Styles = [
  ...decl("border-width", "1px"),
  ...decl("border-style", "solid"),
  ...decl("border-color", colorVar("border")),
];

/** Border color from a themed role. */
export const borderColor = (c: Color): Styles =>
  decl("border-color", colorVar(c));

/**
 * A 2px focus outline in a themed role — the visible,
 * non-color-dependent focus affordance components pair
 * with `:focus-visible` (accessibility-first: focus is
 * never conveyed by color alone at the component layer).
 */
export const outline = (c: Color): Styles =>
  decl("outline", `2px solid ${colorVar(c)}`);

/**
 * A fixed column track: the whole flex shorthand plus
 * the width, so a `basis` column neither grows nor
 * shrinks off its measure. One atom (not separate
 * grow/shrink longhands) so it can never half-conflict
 * with {@link fluid} through class order. Introduced
 * with the layout combinators: sizing is a composed
 * atom, not a config field.
 */
export const basis = (w: SoftStr): Styles => [
  ...decl("flex", `0 0 ${w}`),
  ...decl("width", w),
];

/**
 * The fluid column track: fills the remaining row and
 * may shrink below its content (`min-width:0`, so long
 * words cannot blow the strip open). The counterpart of
 * {@link basis}; a row is expected to hold at most one —
 * a composition convention, not a type constraint.
 */
export const fluid: Styles = [
  ...decl("flex", "1 1 auto"),
  ...decl("min-width", "0"),
];
