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
