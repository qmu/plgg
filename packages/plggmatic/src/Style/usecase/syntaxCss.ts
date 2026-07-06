import { type SoftStr } from "plgg";
import { type Scheme } from "plggmatic/Style/model/scheme";
import { hex } from "plggmatic/Style/model/hexColor";
import {
  type SyntaxKind,
  syntaxKinds,
  syntaxHex,
  syntaxVar,
} from "plggmatic/Style/model/syntax";
import { cssPrefix } from "plggmatic/Meta/model/identity";

/**
 * The `--pm-code-*` custom-property declarations for one
 * scheme, as a single CSS body, in {@link syntaxKinds}
 * order.
 */
const varsFor = (scheme: Scheme): SoftStr =>
  syntaxKinds
    .map(
      (k: SyntaxKind) =>
        `--${cssPrefix}-code-${k}:${hex(syntaxHex(scheme, k))};`,
    )
    .join("");

/**
 * The `.tok-<kind>` class rules, one per colored kind, each
 * pointing at its `--pm-code-*` property so the color
 * reschemes with `html.dark`. `comment` additionally carries
 * `font-style:italic`. Deliberately **unscoped** (no
 * `.vp-doc` ancestor): `tok-*` classes only ever appear on
 * plgg-highlight's spans, and an unscoped block is what lets
 * ANY plggmatic consumer get themed code blocks for free.
 * No rule exists for `identifier`/`plain` — they inherit the
 * code block's default ink.
 */
const rulesFor = (): SoftStr =>
  syntaxKinds
    .map((k: SyntaxKind) =>
      k === "comment"
        ? `.tok-${k}{color:${syntaxVar(k)};font-style:italic}`
        : `.tok-${k}{color:${syntaxVar(k)}}`,
    )
    .join("");

/**
 * The framework's syntax-highlight stylesheet: the
 * `--pm-code-*` properties on `:root` (light) with the
 * `html.dark` override, followed by the `.tok-*` class
 * rules. Self-contained (defines the properties it
 * references) and escape-safe (no `<`, `>`, `&`) so it
 * survives an SSR text escaper byte-for-byte; a host
 * composes it into the document `<style>` alongside
 * `schemeCss` (this ticket finishes the D16 cutover for
 * code blocks — the last colors in plggpress `baseCss` that
 * referenced no custom property).
 */
export const syntaxCss: SoftStr =
  `:root{${varsFor("light")}}html.dark{${varsFor("dark")}}` +
  rulesFor();
