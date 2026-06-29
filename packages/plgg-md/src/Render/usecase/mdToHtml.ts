import {
  SoftStr,
  Option,
  match,
  pipe,
  fromNullable,
  getOr,
  isSome,
} from "plgg";
import {
  Html,
  Phrasing,
  el,
  p,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  ul,
  ol,
  li,
  table,
  thead,
  tbody,
  tr,
  th,
  td,
  hr,
  code,
  em,
  strong,
  a,
  img,
  br,
  text,
  class_,
  attr,
  href,
} from "plgg-view";
import {
  Inline,
  text$,
  code$,
  emph$,
  strong$,
  link$,
  image$,
  lineBreak$,
} from "plgg-md/Inline/model/Inline";
import {
  renderInline,
  plainText,
} from "plgg-md/Inline/usecase/renderInline";
import {
  Block,
  HeadingLevel,
  ListItem,
  TableAlign,
  heading$,
  para$,
  codeFence$,
  list$,
  quote$,
  table$,
  callout$,
  thematicBreak$,
} from "plgg-md/Block/model/Block";
import {
  Highlighter,
  LinkResolver,
} from "plgg-md/Render/model/seam";
import {
  Sluggers,
  makeSluggers,
} from "plgg-md/Render/usecase/slugify";

/**
 * Folds one {@link Inline} node into a `plgg-view`
 * phrasing node. Code text is wrapped verbatim (escaped
 * at render); emphasis/strong/link text recurse; every
 * `Link`/`Image` target is routed through the injected
 * {@link LinkResolver} so this module owns no base-path
 * logic. There is no raw-HTML arm — a stray `<`/`>` rode
 * in as {@link Inline} `Text` and is HTML-escaped by
 * `renderToString` (§6c).
 */
const inlineToHtml =
  (resolve: LinkResolver) =>
  (inl: Inline): Phrasing<never> =>
    match(inl)(
      [
        text$(),
        ({ content }): Phrasing<never> =>
          text(content.value),
      ],
      [
        code$(),
        ({ content }): Phrasing<never> =>
          code([], [text(content.value)]),
      ],
      [
        emph$(),
        ({ content }): Phrasing<never> =>
          em(
            [],
            content.children.map(
              inlineToHtml(resolve),
            ),
          ),
      ],
      [
        strong$(),
        ({ content }): Phrasing<never> =>
          strong(
            [],
            content.children.map(
              inlineToHtml(resolve),
            ),
          ),
      ],
      [
        link$(),
        ({ content }): Phrasing<never> =>
          a(
            [href(resolve(content.href))],
            content.children.map(
              inlineToHtml(resolve),
            ),
          ),
      ],
      [
        image$(),
        ({ content }): Phrasing<never> =>
          img(
            [
              attr("src", resolve(content.src)),
              attr("alt", content.alt),
            ],
            [],
          ),
      ],
      [
        lineBreak$(),
        (): Phrasing<never> => br([], []),
      ],
    );

/** Scans then folds a source line into phrasing nodes. */
const renderInlines =
  (resolve: LinkResolver) =>
  (
    line: SoftStr,
  ): ReadonlyArray<Phrasing<never>> =>
    renderInline(line).map(inlineToHtml(resolve));

/** A `text-align` style attribute for a non-default column. */
const alignAttrs = (
  aligns: ReadonlyArray<TableAlign>,
  i: number,
): ReadonlyArray<ReturnType<typeof attr>> => {
  const a = pipe(
    fromNullable(aligns[i]),
    getOr<TableAlign>("default"),
  );
  return a === "default"
    ? []
    : [attr("style", `text-align:${a}`)];
};

/** A nested list (`ul`/`ol`), the only Flow a `li` nests here. */
type ListEl =
  | Html<never, "ul">
  | Html<never, "ol">;

/** Builds the `ul`/`ol` element for a list's items. */
const renderListEl =
  (resolve: LinkResolver) =>
  (
    ordered: boolean,
    items: ReadonlyArray<ListItem>,
  ): ListEl =>
    ordered
      ? ol([], items.map(renderItem(resolve)))
      : ul([], items.map(renderItem(resolve)));

/**
 * Renders one list item: its inline text followed by any
 * nested lists. The block tokenizer only ever nests a
 * `List` under an item (continuation text is merged into
 * the item's `text`), so a direct `__tag` discriminant
 * picks the nested list and folds everything else away —
 * which keeps `ul`/`ol`/`li` fully typed, with no `el`
 * hatch and no opaque highlighter `Html<never>` reaching
 * this flow position.
 */
const renderItem =
  (resolve: LinkResolver) =>
  (item: ListItem): Html<never, "li"> =>
    li(
      [],
      [
        ...renderInlines(resolve)(item.text),
        ...item.children.flatMap(
          (child): ReadonlyArray<ListEl> =>
            child.__tag === "List"
              ? [
                  renderListEl(resolve)(
                    child.content.ordered,
                    child.content.items,
                  ),
                ]
              : [],
        ),
      ],
    );

/**
 * Picks the `hN` builder for a {@link HeadingLevel} and
 * stamps the slug `id`. A literal-level ladder rather
 * than a `match` because the six builders have distinct
 * return tags (`h1`…`h6`); the ladder is total over the
 * `1 | 2 | 3 | 4 | 5 | 6` domain.
 */
const renderHeading = (
  level: HeadingLevel,
  id: SoftStr,
  children: ReadonlyArray<Phrasing<never>>,
): Html<never> => {
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

/** The callout title: the custom one, else the capitalized kind. */
const calloutTitle = (
  kind: SoftStr,
  title: Option<SoftStr>,
): SoftStr =>
  isSome(title)
    ? title.content
    : `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;

/**
 * Folds one {@link Block} into a `plgg-view` tree under
 * the injected {@link Highlighter} and
 * {@link LinkResolver}, threading the per-page
 * {@link Sluggers} so heading ids match
 * `spike-decisions.md`'s exact VitePress slugs (with
 * per-page dedup). Inline-only blocks use the typed
 * builders; the block-nesting wrappers (`blockquote`,
 * the callout `div`) use the permissive `el` builder
 * because they may hold the highlighter's opaque
 * `Html<never>` — still pure Html data, escaped by
 * `renderToString`, never a hand-assembled string.
 */
export const blockToHtml =
  (
    highlight: Highlighter,
    resolve: LinkResolver,
    slug: Sluggers,
  ) =>
  (block: Block): Html<never> =>
    match(block)(
      [
        heading$(),
        ({ content }): Html<never> => {
          const inlines = renderInline(
            content.text,
          );
          return renderHeading(
            content.level,
            slug.next(plainText(inlines)),
            inlines.map(inlineToHtml(resolve)),
          );
        },
      ],
      [
        para$(),
        ({ content }): Html<never> =>
          p(
            [],
            renderInlines(resolve)(content.text),
          ),
      ],
      [
        codeFence$(),
        ({ content }): Html<never> =>
          highlight(content.lang, content.code),
      ],
      [
        list$(),
        ({ content }): Html<never> =>
          renderListEl(resolve)(
            content.ordered,
            content.items,
          ),
      ],
      [
        table$(),
        ({ content }): Html<never> =>
          table(
            [],
            [
              thead(
                [],
                [
                  tr(
                    [],
                    content.header.map(
                      (cell, i) =>
                        th(
                          alignAttrs(
                            content.align,
                            i,
                          ),
                          renderInlines(resolve)(
                            cell,
                          ),
                        ),
                    ),
                  ),
                ],
              ),
              tbody(
                [],
                content.rows.map((row) =>
                  tr(
                    [],
                    row.map((cell, i) =>
                      td(
                        alignAttrs(
                          content.align,
                          i,
                        ),
                        renderInlines(resolve)(
                          cell,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
      ],
      [
        quote$(),
        ({ content }): Html<never> =>
          el(
            "blockquote",
            [],
            content.children.map(
              blockToHtml(
                highlight,
                resolve,
                slug,
              ),
            ),
          ),
      ],
      [
        callout$(),
        ({ content }): Html<never> =>
          el(
            "div",
            [
              class_(
                `callout callout-${content.kind}`,
              ),
            ],
            [
              p(
                [class_("callout-title")],
                [
                  text(
                    calloutTitle(
                      content.kind,
                      content.title,
                    ),
                  ),
                ],
              ),
              ...content.children.map(
                blockToHtml(
                  highlight,
                  resolve,
                  slug,
                ),
              ),
            ],
          ),
      ],
      [
        thematicBreak$(),
        (): Html<never> => hr([], []),
      ],
    );

/**
 * Builds the document fold: given the injected
 * {@link Highlighter} and {@link LinkResolver}, folds a
 * {@link Block} sequence into a single `Html<never>`
 * body wrapped in a `<div>`. One fresh {@link Sluggers}
 * per call resets the per-page dedup counter.
 */
export const mdToHtml =
  (
    highlight: Highlighter,
    resolveLink: LinkResolver,
  ) =>
  (doc: ReadonlyArray<Block>): Html<never> =>
    el(
      "div",
      [],
      doc.map(
        blockToHtml(
          highlight,
          resolveLink,
          makeSluggers(),
        ),
      ),
    );
