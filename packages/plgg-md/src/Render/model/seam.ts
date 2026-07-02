import { Option, SoftStr, isSome } from "plgg";
import {
  Html,
  Attribute,
  pre,
  code,
  text,
  class_,
} from "plgg-view";

/**
 * The code-fence highlighting seam: given the raw fence
 * language token (`None` when unlabeled) and the verbatim
 * body, produce a `plgg-view` HTML tree. `plgg-md` ships
 * only the {@link plainHighlighter} fallback and imports
 * NO compiler — the real language-aware highlighter is
 * injected by `plgg-highlight`, keeping this package
 * compiler-free.
 */
export type Highlighter = (
  lang: Option<SoftStr>,
  code: SoftStr,
) => Html<never>;

/**
 * The link-rewriting seam: maps a raw `[…](href)` /
 * `![…](src)` target to the href actually emitted.
 * `plgg-md` ships only the {@link identityResolver};
 * the base-path-aware resolver (e.g. prefixing the deploy
 * base path, resolving `#fragment`s) is injected by
 * `plggpress`, so this package owns NO base-path logic.
 */
export type LinkResolver = (
  href: SoftStr,
) => SoftStr;

/**
 * The default fence renderer: an escaped
 * `<pre><code>…</code></pre>` with a `language-<token>`
 * class when the fence is labeled (no token coloring —
 * the body is plain HTML-escaped text, the XSS-safe
 * fallback per `spike-decisions.md` §2). Carries no
 * `Msg`, so it slots into any tree.
 */
export const plainHighlighter: Highlighter = (
  lang,
  body,
) => {
  const attrs: ReadonlyArray<Attribute<never>> =
    isSome(lang)
      ? [class_(`language-${lang.content}`)]
      : [];
  return pre([], [code(attrs, [text(body)])]);
};

/**
 * The default link resolver: identity. `plggpress`
 * overrides it with its base-aware `href()` helper.
 */
export const identityResolver: LinkResolver = (
  href,
) => href;
