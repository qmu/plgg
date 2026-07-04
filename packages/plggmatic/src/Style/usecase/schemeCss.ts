import { type SoftStr } from "plgg";
import { type Scheme } from "plggmatic/Style/model/scheme";
import { colors } from "plggmatic/Style/model/token";
import {
  type Palette,
  defaultPalette,
  paletteHex,
  hex,
} from "plggmatic/Style/model/palette";
import { cssPrefix } from "plggmatic/Meta/model/identity";

/**
 * The `--pm-*` custom-property declarations for one scheme
 * of a palette, as a single CSS body (`--pm-surface:#…;…`).
 * Every token is emitted, in {@link colors} order.
 */
const varsFor = (
  palette: Palette,
  scheme: Scheme,
): SoftStr =>
  colors
    .map(
      (c) =>
        `--${cssPrefix}-${c}:${hex(paletteHex(palette, scheme, c))};`,
    )
    .join("");

/**
 * The framework's base color stylesheet for ANY palette:
 * the light scheme on `:root` and the dark override under
 * `html.dark`, toggled by one `dark` class. `html.dark` is
 * the single published scheme mechanism (no attribute
 * variants). Escape-safe (no `<`, `>`, `&`) so it survives
 * an SSR text escaper byte-for-byte. Inject ahead of the
 * collected atomic rules so the custom properties are
 * defined before any `var(--pm-*)` resolves.
 */
export const schemeCssOf = (
  palette: Palette,
): SoftStr =>
  `:root{${varsFor(palette, "light")}}html.dark{${varsFor(palette, "dark")}}`;

/**
 * The default (monochrome) scheme CSS — exactly
 * `schemeCssOf(defaultPalette)`, so zero-config consumers
 * are untouched by the override API.
 */
export const schemeCss: SoftStr =
  schemeCssOf(defaultPalette);
