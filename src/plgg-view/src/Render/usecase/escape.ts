import { SoftStr } from "plgg";

/**
 * Escapes text content for HTML. `&` is replaced first so the entities
 * introduced by the later replacements are not double-escaped. This is a
 * correctness requirement, not a nicety: unescaped text is the classic XSS
 * sink, so every `Text` node passes through here in `renderToString`.
 */
export const escapeText = (value: SoftStr): SoftStr =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Escapes a double-quoted attribute value. Beyond {@link escapeText}'s set, the
 * quote characters are escaped so a value can never break out of its
 * surrounding `"..."` and inject further attributes or markup.
 */
export const escapeAttr = (value: SoftStr): SoftStr =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Whether an attribute name is safe to emit verbatim. Names are author-supplied
 * keys; restricting them to the HTML name grammar means a malformed or
 * hostile key (whitespace, `>`, `=`, quotes) can never forge new attributes.
 */
export const isSafeAttrName = (name: SoftStr): boolean =>
  /^[A-Za-z_:][-A-Za-z0-9_:.]*$/.test(name);
