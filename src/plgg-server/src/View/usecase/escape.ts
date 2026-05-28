import { SoftStr } from "plgg";

/**
 * Escapes text content for HTML. `&` is replaced first so the entities the
 * later replacements introduce are not double-escaped. A correctness
 * requirement: every text node passes through here during SSR, so unescaped
 * user data can never become markup (the classic XSS sink).
 */
export const escapeText = (value: SoftStr): SoftStr =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Escapes a double-quoted attribute value — adds the quote characters to
 * {@link escapeText}'s set so a value can never break out of its `"..."` and
 * inject further attributes or markup.
 */
export const escapeAttr = (value: SoftStr): SoftStr =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Whether an attribute name is safe to emit verbatim. Names come from
 * author-supplied prop keys; restricting them to the HTML name grammar means a
 * malformed or hostile key can never forge new attributes (used by both the SSR
 * string renderer and the client DOM renderer).
 */
export const isSafeAttrName = (name: SoftStr): boolean =>
  /^[A-Za-z_:][-A-Za-z0-9_:.]*$/.test(name);
