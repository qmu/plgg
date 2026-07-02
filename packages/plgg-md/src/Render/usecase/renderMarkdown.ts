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
} from "plgg-md/Inline/model/Inline";
import {
  renderInline,
  plainText,
} from "plgg-md/Inline/usecase/renderInline";
import {
  Block,
  ListItem,
  heading$,
  para$,
  list$,
  table$,
  quote$,
  callout$,
  codeFence$,
  thematicBreak$,
} from "plgg-md/Block/model/Block";
import { parseFrontmatter } from "plgg-md/Frontmatter/usecase/parseFrontmatter";
import { parseBlocks } from "plgg-md/Block/usecase/parseBlocks";
import { MarkdownDoc } from "plgg-md/Render/model/MarkdownDoc";
import {
  Highlighter,
  LinkResolver,
  plainHighlighter,
  identityResolver,
} from "plgg-md/Render/model/seam";
import { mdToHtml } from "plgg-md/Render/usecase/mdToHtml";
import { makeSluggers } from "plgg-md/Render/usecase/slugify";

/**
 * The first H1's plain text, in document order (recursing
 * into callout/quote bodies). `None` when the page has no
 * H1 (the home/config-title case, §6e). The single source
 * the theme uses to derive a prose page's `<title>`.
 */
const firstH1Text = (
  blocks: ReadonlyArray<Block>,
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
                        ),
                      ),
                    )
                  : none(),
            ],
            [
              callout$(),
              ({ content }): Option<SoftStr> =>
                firstH1Text(content.children),
            ],
            [
              quote$(),
              ({ content }): Option<SoftStr> =>
                firstH1Text(content.children),
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
          ),
    none(),
  );

/**
 * Every heading's plain text in document order — the
 * exact sequence the renderer slugs, so the page's
 * `slugs` list and the `body`'s heading ids stay in
 * lock-step (both run the identical slugger over this
 * order).
 */
const headingTexts = (
  blocks: ReadonlyArray<Block>,
): ReadonlyArray<SoftStr> =>
  blocks.flatMap(
    (block): ReadonlyArray<SoftStr> =>
      match(block)(
        [
          heading$(),
          ({
            content,
          }): ReadonlyArray<SoftStr> => [
            plainText(renderInline(content.text)),
          ],
        ],
        [
          callout$(),
          ({ content }): ReadonlyArray<SoftStr> =>
            headingTexts(content.children),
        ],
        [
          quote$(),
          ({ content }): ReadonlyArray<SoftStr> =>
            headingTexts(content.children),
        ],
        [
          para$(),
          (): ReadonlyArray<SoftStr> => [],
        ],
        [
          list$(),
          (): ReadonlyArray<SoftStr> => [],
        ],
        [
          table$(),
          (): ReadonlyArray<SoftStr> => [],
        ],
        [
          codeFence$(),
          (): ReadonlyArray<SoftStr> => [],
        ],
        [
          thematicBreak$(),
          (): ReadonlyArray<SoftStr> => [],
        ],
      ),
  );

/** The page's deduped heading slugs (matches the body ids). */
const collectSlugs = (
  blocks: ReadonlyArray<Block>,
): ReadonlyArray<SoftStr> => {
  const slug = makeSluggers();
  return headingTexts(blocks).map((t) =>
    slug.next(t),
  );
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
      ),
  );

/** Raw link/image targets reachable from a list item. */
const itemHrefs = (
  item: ListItem,
): ReadonlyArray<SoftStr> => [
  ...inlineHrefs(renderInline(item.text)),
  ...item.children.flatMap(blockHrefs),
];

/** Raw link/image targets reachable from a block. */
const blockHrefs = (
  block: Block,
): ReadonlyArray<SoftStr> =>
  match(block)(
    [
      heading$(),
      ({ content }): ReadonlyArray<SoftStr> =>
        inlineHrefs(renderInline(content.text)),
    ],
    [
      para$(),
      ({ content }): ReadonlyArray<SoftStr> =>
        inlineHrefs(renderInline(content.text)),
    ],
    [
      list$(),
      ({ content }): ReadonlyArray<SoftStr> =>
        content.items.flatMap(itemHrefs),
    ],
    [
      table$(),
      ({ content }): ReadonlyArray<SoftStr> =>
        [
          ...content.header,
          ...content.rows.flat(),
        ].flatMap((cell) =>
          inlineHrefs(renderInline(cell)),
        ),
    ],
    [
      quote$(),
      ({ content }): ReadonlyArray<SoftStr> =>
        content.children.flatMap(blockHrefs),
    ],
    [
      callout$(),
      ({ content }): ReadonlyArray<SoftStr> =>
        content.children.flatMap(blockHrefs),
    ],
    [
      codeFence$(),
      (): ReadonlyArray<SoftStr> => [],
    ],
    [
      thematicBreak$(),
      (): ReadonlyArray<SoftStr> => [],
    ],
  );

/** Every emitted link target (post-resolver), in document order. */
const collectLinks =
  (resolve: LinkResolver) =>
  (
    blocks: ReadonlyArray<Block>,
  ): ReadonlyArray<SoftStr> =>
    blocks.flatMap(blockHrefs).map(resolve);

/**
 * Renders Markdown source to a {@link MarkdownDoc} under
 * an injected {@link Highlighter} and {@link LinkResolver}:
 * splits frontmatter, tokenizes blocks, folds to an
 * `Html<never>` body, and exposes `firstHeading`, the
 * post-resolver `links`, and the deduped heading `slugs`.
 * A parse failure (unterminated fence/container/table,
 * bad frontmatter) surfaces as an {@link InvalidError},
 * never a throw.
 */
export const renderMarkdownWith =
  (
    highlighter: Highlighter,
    resolveLink: LinkResolver,
  ) =>
  (
    source: SoftStr,
  ): Result<MarkdownDoc, InvalidError> =>
    pipe(
      parseFrontmatter(source),
      chainResult((parsed) =>
        pipe(
          parseBlocks(parsed.body),
          mapResult(
            (blocks): MarkdownDoc => ({
              frontmatter: parsed.frontmatter,
              firstHeading: firstH1Text(blocks),
              body: mdToHtml(
                highlighter,
                resolveLink,
              )(blocks),
              links:
                collectLinks(resolveLink)(blocks),
              slugs: collectSlugs(blocks),
            }),
          ),
        ),
      ),
    );

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
