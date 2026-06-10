import { SoftStr } from "plgg";

/**
 * Escapes text content for HTML. `&` is replaced first so the entities the
 * later replacements introduce are not double-escaped. Every text node passes
 * through here during SSR, so unescaped data can never become markup (the
 * classic XSS sink).
 */
export const escapeText = (value: SoftStr): SoftStr =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Escapes a double-quoted attribute value, adding the quote characters to
 * {@link escapeText}'s set so a value can never break out of its `"..."`.
 */
export const escapeAttr = (value: SoftStr): SoftStr =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Whether an attribute name is safe to emit verbatim. Attribute names are
 * author-supplied; restricting them to the HTML name grammar means a hostile
 * key can never forge new attributes. Used by both the SSR string renderer and
 * the client DOM renderer.
 */
export const isSafeAttrName = (
  name: SoftStr,
): boolean =>
  /^[A-Za-z_:][-A-Za-z0-9_:.]*$/.test(name);

/**
 * Neutralizes the characters by which a CSS selector/property/value could
 * escape its declaration block or the surrounding `<style>` element, replacing
 * each with its CSS hex escape (a valid, inert literal). Declaration values are
 * the `value`-analog of {@link escapeAttr} — author data (`decl(prop, value)`)
 * can reach them, and the rule is interpolated raw into `<style>…</style>` on
 * the server, so an unescaped `}`/`</style` would close the block/element and
 * inject arbitrary rules or markup. Backslash is escaped first so it cannot
 * recombine with the escapes that follow. `>` is intentionally left alone so
 * legitimate selector combinators survive: `</style>` is killed by escaping
 * `<`, and block breakout by escaping `{`/`}`, neither of which needs `>`.
 */
export const escapeCss = (
  value: SoftStr,
): SoftStr =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/</g, "\\3c ")
    .replace(/\{/g, "\\7b ")
    .replace(/\}/g, "\\7d ")
    .replace(/;/g, "\\3b ");
