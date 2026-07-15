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
  raw,
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
  htmlSpan$,
} from "plgg-md/Inline/model/Inline";
import {
  renderInline,
  plainText,
} from "plgg-md/Inline/usecase/renderInline";
import {
  Block,
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
  htmlBlock$,
} from "plgg-md/Block/model/Block";
import {
  LinkResolver,
  RenderOptions,
  HeadingDecorator,
} from "plgg-md/Render/model/seam";
import {
  Sluggers,
  makeSluggers,
} from "plgg-md/Render/usecase/slugify";
import {
  Ordinals,
  makeOrdinals,
} from "plgg-md/Render/usecase/ordinal";

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
      // a raw inline HTML tag is emitted verbatim
      [
        htmlSpan$(),
        ({ content }): Phrasing<never> =>
          raw(content.html),
      ],
    );

/**
 * Scans then folds a source line into phrasing nodes,
 * threading `rawHtml` so inline HTML spans are recognized
 * exactly as the block that owns the line was parsed.
 */
const renderInlines =
  (resolve: LinkResolver, rawHtml: boolean) =>
  (
    line: SoftStr,
  ): ReadonlyArray<Phrasing<never>> =>
    renderInline(line, rawHtml).map(
      inlineToHtml(resolve),
    );

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
  Html<never, "ul"> | Html<never, "ol">;

/** Builds the `ul`/`ol` element for a list's items. */
const renderListEl =
  (resolve: LinkResolver, rawHtml: boolean) =>
  (
    ordered: boolean,
    items: ReadonlyArray<ListItem>,
  ): ListEl =>
    ordered
      ? ol(
          [],
          items.map(renderItem(resolve, rawHtml)),
        )
      : ul(
          [],
          items.map(renderItem(resolve, rawHtml)),
        );

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
  (resolve: LinkResolver, rawHtml: boolean) =>
  (item: ListItem): Html<never, "li"> =>
    li(
      [],
      [
        ...renderInlines(
          resolve,
          rawHtml,
        )(item.text),
        ...item.children.flatMap(
          (child): ReadonlyArray<ListEl> =>
            child.__tag === "List"
              ? [
                  renderListEl(resolve, rawHtml)(
                    child.content.ordered,
                    child.content.items,
                  ),
                ]
              : [],
        ),
      ],
    );

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
 * the {@link RenderOptions} (injected highlighter + link
 * resolver + `rawHtml` mode), threading the per-page
 * {@link Sluggers} and {@link Ordinals} so heading ids
 * match the configured slugger (with per-page dedup) and
 * heading numbers follow document order. Inline-only blocks use
 * the typed builders; the block-nesting wrappers
 * (`blockquote`, the callout `div`) use the permissive
 * `el` builder because they may hold the highlighter's
 * opaque `Html<never>` — still pure Html data, escaped by
 * `renderToString`, never a hand-assembled string. An
 * {@link htmlBlock} folds to a `raw` passthrough node
 * emitted verbatim.
 */
export const blockToHtml =
  (
    options: RenderOptions,
    slug: Sluggers,
    ordinal: Ordinals,
  ) =>
  (block: Block): Html<never> =>
    match(block)(
      [
        heading$(),
        ({ content }): Html<never> => {
          const inlines = renderInline(
            content.text,
            options.rawHtml,
          );
          return options.decorateHeading({
            level: content.level,
            id: slug.next(plainText(inlines)),
            ordinal: ordinal.next(content.level),
            children: inlines.map(
              inlineToHtml(options.resolveLink),
            ),
          });
        },
      ],
      [
        para$(),
        ({ content }): Html<never> =>
          p(
            [],
            renderInlines(
              options.resolveLink,
              options.rawHtml,
            )(content.text),
          ),
      ],
      [
        codeFence$(),
        ({ content }): Html<never> =>
          options.highlighter(
            content.lang,
            content.code,
          ),
      ],
      [
        list$(),
        ({ content }): Html<never> =>
          renderListEl(
            options.resolveLink,
            options.rawHtml,
          )(content.ordered, content.items),
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
                          renderInlines(
                            options.resolveLink,
                            options.rawHtml,
                          )(cell),
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
                        renderInlines(
                          options.resolveLink,
                          options.rawHtml,
                        )(cell),
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
              blockToHtml(options, slug, ordinal),
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
                  options,
                  slug,
                  ordinal,
                ),
              ),
            ],
          ),
      ],
      [
        thematicBreak$(),
        (): Html<never> => hr([], []),
      ],
      // a raw HTML block is emitted verbatim
      [
        htmlBlock$(),
        ({ content }): Html<never> =>
          raw(content.html),
      ],
    );

/**
 * Builds the document fold: given the {@link RenderOptions},
 * folds a {@link Block} sequence into a single
 * `Html<never>` body wrapped in a `<div>`. One fresh
 * {@link Sluggers} over the configured base slugger and one
 * fresh {@link Ordinals} per call reset the per-page dedup
 * and outline counters. Both are deterministic over the
 * heading sequence, which is what lets `collectHeadings`
 * run them again and get the same answers — see
 * {@link HeadingDecorator}.
 */
export const mdToHtml =
  (options: RenderOptions) =>
  (doc: ReadonlyArray<Block>): Html<never> =>
    el(
      "div",
      [],
      doc.map(
        blockToHtml(
          options,
          makeSluggers(options.slug),
          makeOrdinals(),
        ),
      ),
    );
