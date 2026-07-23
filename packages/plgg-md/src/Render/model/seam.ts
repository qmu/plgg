import { Option, SoftStr, isSome } from "plgg";
import {
  Html,
  Phrasing,
  Attribute,
  pre,
  code,
  text,
  class_,
  attr,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
} from "plgg-view";
import { HeadingLevel } from "plgg-md/Block/model/Block";

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

/**
 * The heading-slug seam: a heading's already-resolved
 * plain text → its base slug (pre per-page dedup).
 * `plgg-md` ships two — the VitePress-exact `slugify`
 * (the default) and the github-slugger-compatible
 * `githubSlugify` — and a site may inject either through
 * {@link RenderOptions}. Per-page `-1`/`-2` dedup is
 * layered on separately by `makeSluggers`.
 */
export type SlugFn = (text: SoftStr) => SoftStr;

/**
 * A heading's position in the document outline, outermost
 * first: `[3, 1, 2]` is the second H3 under the first H2
 * under the third H1 — what a site prints as `3-1-2.` or
 * `3.1.2`. Its LENGTH is the heading's depth, so the array
 * carries the hierarchy rather than a pre-formatted string:
 * formatting is the site's, counting is not.
 */
export type Ordinal = ReadonlyArray<number>;

/** A heading, decomposed for {@link HeadingDecorator}. */
export type HeadingParts = Readonly<{
  level: HeadingLevel;
  /** The allocated slug, already per-page deduped. */
  id: SoftStr;
  /** This heading's outline position — see {@link Ordinal}. */
  ordinal: Ordinal;
  /** The heading's own rendered inline content. */
  children: ReadonlyArray<Phrasing<never>>;
}>;

/**
 * The heading-element seam: owns the whole `<hN>`. A site
 * wanting numbered headings (`1-2.`), a permalink anchor,
 * or its own classes injects one through
 * {@link RenderOptions}; `plgg-md` ships
 * {@link defaultHeading}.
 *
 * Note what this seam does NOT hand over: the `ordinal` and
 * the `id` arrive already computed. That is deliberate, and
 * it is the design's whole point. `MarkdownDoc`'s heading
 * list and its `body` are built by two separate traversals
 * (`collectHeadings` and `mdToHtml`); they agree today only
 * because slugging is a deterministic function of the
 * heading sequence, so running it twice over that one
 * sequence cannot disagree. Counting is such a function
 * too, so `plgg-md` runs it in BOTH traversals and hands
 * the answer over. Had the seam instead let a site carry
 * its own counter, that counter would advance only in the
 * body traversal, and a number in the table of contents
 * would silently disagree with the one on the heading it
 * points at — surfacing far from here, as a citation
 * mismatch. A decorator holding no state cannot drift,
 * which is why this one is a pure function of its parts.
 */
export type HeadingDecorator = (
  parts: HeadingParts,
) => Html<never>;

/**
 * The default heading renderer: the `hN` for the level with
 * the slug stamped as `id`, and nothing else — the ordinal
 * is passed over, so output is byte-identical to what every
 * consumer had before the seam existed. A literal-level
 * ladder rather than a `match` because the six builders
 * have distinct return tags (`h1`…`h6`); the ladder is
 * total over the `1 | 2 | 3 | 4 | 5 | 6` domain.
 */
export const defaultHeading: HeadingDecorator = ({
  level,
  id,
  children,
}) => {
  const at: ReadonlyArray<
    ReturnType<typeof attr>
  > = [attr("id", id)];
  return level === 1
    ? h1(at, children)
    : level === 2
      ? h2(at, children)
      : level === 3
        ? h3(at, children)
        : level === 4
          ? h4(at, children)
          : level === 5
            ? h5(at, children)
            : h6(at, children);
};

/**
 * The render boundary's full option set as **pure data**:
 * the three element-producing seams ({@link Highlighter},
 * {@link LinkResolver}, {@link HeadingDecorator}) plus the
 * two site-parameterized behaviors this package keeps at
 * spike defaults for the guide — `rawHtml` (verbatim HTML
 * passthrough; `false` escapes angle brackets as text, the
 * v1 decision) and `slug` (the base heading slugger).
 * `renderMarkdown`'s default entry pins all five to their
 * defaults, so the guide's output is unchanged; a site opts
 * in through {@link renderMarkdownWithOptions}.
 */
export type RenderOptions = Readonly<{
  highlighter: Highlighter;
  resolveLink: LinkResolver;
  rawHtml: boolean;
  slug: SlugFn;
  decorateHeading: HeadingDecorator;
}>;
