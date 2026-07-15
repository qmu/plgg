import {
  SoftStr,
  Option,
  Result,
  InvalidError,
  some,
  none,
  isSome,
  match,
  pipe,
  mapResult,
  chainResult,
} from "plgg";
import {
  Inline,
  text$,
  code$,
  link$,
  image$,
  emph$,
  strong$,
  lineBreak$,
  htmlSpan$,
} from "plgg-md/Inline/model/Inline";
import {
  renderInline,
  plainText,
} from "plgg-md/Inline/usecase/renderInline";
import {
  Block,
  HeadingLevel,
  ListItem,
  heading$,
  para$,
  list$,
  table$,
  quote$,
  callout$,
  codeFence$,
  thematicBreak$,
  htmlBlock$,
} from "plgg-md/Block/model/Block";
import { parseFrontmatter } from "plgg-md/Frontmatter/usecase/parseFrontmatter";
import {
  parseBlocks,
  normalizeLineEndings,
} from "plgg-md/Block/usecase/parseBlocks";
import {
  MarkdownDoc,
  MdHeading,
} from "plgg-md/Render/model/MarkdownDoc";
import {
  Highlighter,
  LinkResolver,
  RenderOptions,
  plainHighlighter,
  identityResolver,
} from "plgg-md/Render/model/seam";
import { mdToHtml } from "plgg-md/Render/usecase/mdToHtml";
import {
  makeSluggers,
  slugify,
} from "plgg-md/Render/usecase/slugify";

/**
 * The first H1's plain text, in document order (recursing
 * into callout/quote bodies). `None` when the page has no
 * H1 (the home/config-title case, §6e). The single source
 * the theme uses to derive a prose page's `<title>`.
 */
const firstH1Text = (
  blocks: ReadonlyArray<Block>,
  rawHtml: boolean,
): Option<SoftStr> =>
  blocks.reduce<Option<SoftStr>>(
    (acc, block) =>
      isSome(acc)
        ? acc
        : match(block)(
            [
              heading$(),
              ({ content }): Option<SoftStr> =>
                content.level === 1
                  ? some(
                      plainText(
                        renderInline(
                          content.text,
                          rawHtml,
                        ),
                      ),
                    )
                  : none(),
            ],
            [
              callout$(),
              ({ content }): Option<SoftStr> =>
                firstH1Text(
                  content.children,
                  rawHtml,
                ),
            ],
            [
              quote$(),
              ({ content }): Option<SoftStr> =>
                firstH1Text(
                  content.children,
                  rawHtml,
                ),
            ],
            [
              para$(),
              (): Option<SoftStr> => none(),
            ],
            [
              list$(),
              (): Option<SoftStr> => none(),
            ],
            [
              table$(),
              (): Option<SoftStr> => none(),
            ],
            [
              codeFence$(),
              (): Option<SoftStr> => none(),
            ],
            [
              thematicBreak$(),
              (): Option<SoftStr> => none(),
            ],
            [
              htmlBlock$(),
              (): Option<SoftStr> => none(),
            ],
          ),
    none(),
  );

/** A heading's depth + plain text, pre-slugging. */
type HeadingEntry = Readonly<{
  level: HeadingLevel;
  text: SoftStr;
}>;

/**
 * Every heading's depth + plain text in document order —
 * the exact sequence the renderer slugs, so the page's
 * `slugs`/`headings` lists and the `body`'s heading ids
 * stay in lock-step (both run the identical slugger over
 * this order).
 */
const headingEntries = (
  blocks: ReadonlyArray<Block>,
  rawHtml: boolean,
): ReadonlyArray<HeadingEntry> =>
  blocks.flatMap(
    (block): ReadonlyArray<HeadingEntry> =>
      match(block)(
        [
          heading$(),
          ({
            content,
          }): ReadonlyArray<HeadingEntry> => [
            {
              level: content.level,
              text: plainText(
                renderInline(
                  content.text,
                  rawHtml,
                ),
              ),
            },
          ],
        ],
        [
          callout$(),
          ({
            content,
          }): ReadonlyArray<HeadingEntry> =>
            headingEntries(
              content.children,
              rawHtml,
            ),
        ],
        [
          quote$(),
          ({
            content,
          }): ReadonlyArray<HeadingEntry> =>
            headingEntries(
              content.children,
              rawHtml,
            ),
        ],
        [
          para$(),
          (): ReadonlyArray<HeadingEntry> => [],
        ],
        [
          list$(),
          (): ReadonlyArray<HeadingEntry> => [],
        ],
        [
          table$(),
          (): ReadonlyArray<HeadingEntry> => [],
        ],
        [
          codeFence$(),
          (): ReadonlyArray<HeadingEntry> => [],
        ],
        [
          thematicBreak$(),
          (): ReadonlyArray<HeadingEntry> => [],
        ],
        [
          htmlBlock$(),
          (): ReadonlyArray<HeadingEntry> => [],
        ],
      ),
  );

/**
 * The typed heading list (depth + text + slug) — ONE
 * slugger run over the document order, so the slugs here
 * ARE the ids the body carries; `slugs` derives from this
 * list and cannot drift.
 */
const collectHeadings = (
  blocks: ReadonlyArray<Block>,
  options: RenderOptions,
): ReadonlyArray<MdHeading> => {
  const slug = makeSluggers(options.slug);
  return headingEntries(
    blocks,
    options.rawHtml,
  ).map((entry): MdHeading => ({
    level: entry.level,
    text: entry.text,
    slug: slug.next(entry.text),
  }));
};

/** Raw link/image targets reachable from inline nodes. */
const inlineHrefs = (
  inlines: ReadonlyArray<Inline>,
): ReadonlyArray<SoftStr> =>
  inlines.flatMap(
    (node): ReadonlyArray<SoftStr> =>
      match(node)(
        [
          link$(),
          ({
            content,
          }): ReadonlyArray<SoftStr> => [
            content.href,
            ...inlineHrefs(content.children),
          ],
        ],
        [
          image$(),
          ({
            content,
          }): ReadonlyArray<SoftStr> => [
            content.src,
          ],
        ],
        [
          emph$(),
          ({ content }): ReadonlyArray<SoftStr> =>
            inlineHrefs(content.children),
        ],
        [
          strong$(),
          ({ content }): ReadonlyArray<SoftStr> =>
            inlineHrefs(content.children),
        ],
        [
          text$(),
          (): ReadonlyArray<SoftStr> => [],
        ],
        [
          code$(),
          (): ReadonlyArray<SoftStr> => [],
        ],
        [
          lineBreak$(),
          (): ReadonlyArray<SoftStr> => [],
        ],
        [
          htmlSpan$(),
          (): ReadonlyArray<SoftStr> => [],
        ],
      ),
  );

/** Raw link/image targets reachable from a list item. */
const itemHrefs = (
  item: ListItem,
  rawHtml: boolean,
): ReadonlyArray<SoftStr> => [
  ...inlineHrefs(
    renderInline(item.text, rawHtml),
  ),
  ...item.children.flatMap((child) =>
    blockHrefs(child, rawHtml),
  ),
];

/** Raw link/image targets reachable from a block. */
const blockHrefs = (
  block: Block,
  rawHtml: boolean,
): ReadonlyArray<SoftStr> =>
  match(block)(
    [
      heading$(),
      ({ content }): ReadonlyArray<SoftStr> =>
        inlineHrefs(
          renderInline(content.text, rawHtml),
        ),
    ],
    [
      para$(),
      ({ content }): ReadonlyArray<SoftStr> =>
        inlineHrefs(
          renderInline(content.text, rawHtml),
        ),
    ],
    [
      list$(),
      ({ content }): ReadonlyArray<SoftStr> =>
        content.items.flatMap((item) =>
          itemHrefs(item, rawHtml),
        ),
    ],
    [
      table$(),
      ({ content }): ReadonlyArray<SoftStr> =>
        [
          ...content.header,
          ...content.rows.flat(),
        ].flatMap((cell) =>
          inlineHrefs(
            renderInline(cell, rawHtml),
          ),
        ),
    ],
    [
      quote$(),
      ({ content }): ReadonlyArray<SoftStr> =>
        content.children.flatMap((child) =>
          blockHrefs(child, rawHtml),
        ),
    ],
    [
      callout$(),
      ({ content }): ReadonlyArray<SoftStr> =>
        content.children.flatMap((child) =>
          blockHrefs(child, rawHtml),
        ),
    ],
    [
      codeFence$(),
      (): ReadonlyArray<SoftStr> => [],
    ],
    [
      thematicBreak$(),
      (): ReadonlyArray<SoftStr> => [],
    ],
    [
      htmlBlock$(),
      (): ReadonlyArray<SoftStr> => [],
    ],
  );

/** Every emitted link target (post-resolver), in document order. */
const collectLinks =
  (resolve: LinkResolver, rawHtml: boolean) =>
  (
    blocks: ReadonlyArray<Block>,
  ): ReadonlyArray<SoftStr> =>
    blocks
      .flatMap((block) =>
        blockHrefs(block, rawHtml),
      )
      .map(resolve);

/**
 * Renders Markdown source to a {@link MarkdownDoc} under
 * the full {@link RenderOptions} — the injected highlighter
 * and link resolver plus the two site-parameterized seams
 * (`rawHtml` passthrough and the base heading `slug`):
 * splits frontmatter, tokenizes blocks, folds to an
 * `Html<never>` body, and exposes `firstHeading`, the
 * post-resolver `links`, and the deduped heading `slugs`.
 * The heading list and the body run the identical slugger
 * over the identical block order, so ids can never drift.
 * A parse failure (unterminated fence/container/table,
 * bad frontmatter) surfaces as an {@link InvalidError},
 * never a throw.
 */
export const renderMarkdownWithOptions =
  (options: RenderOptions) =>
  (
    source: SoftStr,
  ): Result<MarkdownDoc, InvalidError> =>
    pipe(
      parseFrontmatter(
        normalizeLineEndings(source),
      ),
      chainResult((parsed) =>
        pipe(
          parseBlocks(
            parsed.body,
            options.rawHtml,
          ),
          mapResult((blocks): MarkdownDoc => {
            const headings = collectHeadings(
              blocks,
              options,
            );
            return {
              frontmatter: parsed.frontmatter,
              firstHeading: firstH1Text(
                blocks,
                options.rawHtml,
              ),
              body: mdToHtml(options)(blocks),
              links: collectLinks(
                options.resolveLink,
                options.rawHtml,
              )(blocks),
              slugs: headings.map((h) => h.slug),
              headings,
            };
          }),
        ),
      ),
    );

/**
 * The default {@link RenderOptions} for a given highlighter
 * and link resolver: the spike defaults every existing
 * consumer relies on — `rawHtml` OFF (angle brackets
 * escape as text) and the VitePress-exact {@link slugify}
 * base slugger. A site opts out of either through
 * {@link renderMarkdownWithOptions}.
 */
export const renderOptions = (
  highlighter: Highlighter,
  resolveLink: LinkResolver,
): RenderOptions => ({
  highlighter,
  resolveLink,
  rawHtml: false,
  slug: slugify,
});

/**
 * Renders Markdown with an injected {@link Highlighter} and
 * {@link LinkResolver} at the spike defaults ({@link
 * renderOptions}) — `rawHtml` off, VitePress-exact slugs —
 * so existing consumers keep byte-identical output.
 * `plggpress`/`plgg-highlight` inject the real seams here;
 * a site needing raw HTML or a different slugger reaches
 * for {@link renderMarkdownWithOptions} instead.
 */
export const renderMarkdownWith =
  (
    highlighter: Highlighter,
    resolveLink: LinkResolver,
  ) =>
  (
    source: SoftStr,
  ): Result<MarkdownDoc, InvalidError> =>
    renderMarkdownWithOptions(
      renderOptions(highlighter, resolveLink),
    )(source);

/**
 * Renders Markdown with the default seams — the plain
 * (compiler-free) highlighter and the identity link
 * resolver. `plggpress`/`plgg-highlight` inject the real
 * ones via {@link renderMarkdownWith}.
 */
export const renderMarkdown = (
  source: SoftStr,
): Result<MarkdownDoc, InvalidError> =>
  renderMarkdownWith(
    plainHighlighter,
    identityResolver,
  )(source);
