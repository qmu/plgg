import { type SoftStr } from "plgg";
import { type Scheme } from "plggmatic/Style/model/scheme";
import {
  colors,
  colorHex,
} from "plggmatic/Style/model/token";
import { cssPrefix } from "plggmatic/Meta/model/identity";

/**
 * The `--pm-*` custom-property declarations for one
 * scheme, as a single CSS body (`--pm-surface:#…;…`).
 * Every role is emitted, in {@link colors} order.
 */
const varsFor = (scheme: Scheme): SoftStr =>
  colors
    .map(
      (c) =>
        `--${cssPrefix}-${c}:${colorHex(scheme, c)};`,
    )
    .join("");

/**
 * The framework's base color stylesheet: the light
 * scheme on `:root` and the dark override under
 * `html.dark`, toggled by one `dark` class. This is the
 * ONLY CSS this token layer owns — layout, typography,
 * and the `@media` responsiveness the atomic utilities
 * cannot express belong to the pane-system ticket
 * (20260703144035), which appends its base CSS after
 * this block. Inject this into the document `<style>`
 * ahead of the collected atomic rules so the custom
 * properties are defined before any `var(--pm-*)`
 * resolves. Escape-safe (no `<`, `>`, `&`), so it
 * survives an SSR text escaper byte-for-byte.
 */
export const schemeCss: SoftStr = `:root{${varsFor("light")}}html.dark{${varsFor("dark")}}`;
