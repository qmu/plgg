import { SoftStr } from "plgg";

/**
 * Escapes text content for HTML. `&` is replaced first so the entities the
 * later replacements introduce are not double-escaped. Every text node passes
 * through here during SSR, so unescaped data can never become markup (the
 * classic XSS sink).
 */
export const escapeText = (
  value: SoftStr,
): SoftStr =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Escapes a double-quoted attribute value, adding the quote characters to
 * {@link escapeText}'s set so a value can never break out of its `"..."`.
 */
export const escapeAttr = (
  value: SoftStr,
): SoftStr =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Whether an attribute name is safe to emit verbatim. Attribute names are
 * author-supplied; restricting them to the HTML name grammar means a hostile
 * key can never forge new attributes, and rejecting any `on*` name means the
 * generic `attr()` hatch can never install an inline event handler (the typed
 * `onClick`/… helpers use the separate `Handler` channel, not attributes). Used
 * by both the SSR string renderer and the client DOM renderer.
 */
export const isSafeAttrName = (
  name: SoftStr,
): boolean =>
  /^[A-Za-z_:][-A-Za-z0-9_:.]*$/.test(name) &&
  !/^on/i.test(name);

/**
 * Whether a tag name is safe to emit verbatim. The `el(tag, …)` escape hatch
 * brands `tag` as an arbitrary string; restricting it to the HTML tag grammar
 * means an untrusted tag cannot inject markup on the server
 * (`el("div onload=x", …)`). The client `createElement` already throws on an
 * invalid name, so this guards the SSR path.
 */
export const isSafeTag = (
  tag: SoftStr,
): boolean => /^[a-zA-Z][a-zA-Z0-9-]*$/.test(tag);

/** Attributes whose value is a URL and must be scheme-checked. */
const URL_ATTRS: ReadonlyArray<SoftStr> = [
  "href",
  "src",
  "action",
  "formaction",
  "poster",
  "xlink:href",
];

/**
 * Sanitizes a URL-bearing attribute value. A relative URL (no scheme) or one
 * with an `http`/`https`/`mailto`/`tel` scheme passes; any other scheme
 * (`javascript:`, `data:`, `vbscript:`, …) is neutralized to `"#"`, so a value
 * like `javascript:alert(1)` cannot execute when the link/src is activated.
 * Characters the browser ignores (C0 controls + space) are stripped before the
 * scheme is read, so `java\\tscript:` can't masquerade as a relative URL.
 */
export const safeUrl = (
  value: SoftStr,
): SoftStr => {
  const probe = Array.from(value)
    .filter((c) => c.charCodeAt(0) > 0x20)
    .join("")
    .toLowerCase();
  return /^(https?|mailto|tel):/.test(probe) ||
    !/^[a-z][a-z0-9+.-]*:/.test(probe)
    ? value
    : "#";
};

/**
 * Applies {@link safeUrl} to URL-bearing attributes ({@link URL_ATTRS}), leaving
 * every other value untouched. The single place SSR and the client both call,
 * so their URL policy cannot drift.
 */
export const safeAttrValue = (
  name: SoftStr,
  value: SoftStr,
): SoftStr =>
  URL_ATTRS.some((a) => a === name.toLowerCase())
    ? safeUrl(value)
    : value;

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
