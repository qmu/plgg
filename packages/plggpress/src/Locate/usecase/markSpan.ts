import {
  type SoftStr,
  type Result,
  type Option,
  pipe,
  matchResult,
  matchOption,
  mapResult,
} from "plgg";
import {
  type Html,
  type Attribute,
  type HtmlAlgebra,
  foldHtml,
  el,
  text,
  raw,
  class_,
} from "plggpress/framework";
import {
  type Located,
  type LocateError,
  locateOnce,
} from "plggpress/Locate/usecase/locateOnce";

// HIGHLIGHTING a passage the URL asked for — and, far more
// importantly, REFUSING to.
//
// The span is located in the document's own rendered text
// through the shared exactly-once locator, so a quotation
// that was paraphrased, invented, or merely ambiguous does
// not locate and therefore cannot be painted. What the
// reader sees marked is the document's text, or nothing at
// all: there is no branch here that could display text the
// document does not contain.

/** The class the marked passage wears. */
export const markClass: SoftStr = "vp-mark";

/**
 * The document's own text, in reading order. `Raw` nodes
 * (the highlighter's pre-rendered HTML) contribute NOTHING:
 * their bytes are markup, not prose, so a span can neither
 * be located inside one nor accidentally split one.
 */
const textAlgebra: HtmlAlgebra<never, SoftStr> = {
  element: (
    _tag: SoftStr,
    _attributes: ReadonlyArray<Attribute<never>>,
    children: ReadonlyArray<SoftStr>,
  ): SoftStr => children.join(""),
  text: (value: SoftStr): SoftStr => value,
  raw: (): SoftStr => "",
};

export const textOf = (
  node: Html<never>,
): SoftStr => foldHtml(textAlgebra)(node);

/**
 * A node rebuilt with whatever part of the marked range
 * falls inside it, paired with the text offset just past
 * it. The fold produces one of these FUNCTIONS per node —
 * offset-in, node-and-offset-out — which is how a plain
 * catamorphism threads a running position through a tree.
 */
type Walked = Readonly<{
  node: Html<never>;
  offset: number;
}>;
type Marker = (offset: number) => Walked;

/**
 * Split ONE text node around the marked range. Always the
 * same shape — before, mark, after — with empty pieces
 * rendering as nothing, so there is no "does it start
 * here" branch to get wrong. The wrapper is a `span`,
 * inert in prose.
 */
const markedText = (
  value: SoftStr,
  from: number,
  to: number,
): Html<never> =>
  el(
    "span",
    [],
    [
      text(value.slice(0, from)),
      el(
        "mark",
        [class_(markClass)],
        [text(value.slice(from, to))],
      ),
      text(value.slice(to)),
    ],
  );

const markAlgebra = (
  start: number,
  end: number,
): HtmlAlgebra<never, Marker> => ({
  element:
    (
      tag: SoftStr,
      attributes: ReadonlyArray<Attribute<never>>,
      children: ReadonlyArray<Marker>,
    ): Marker =>
    (offset: number): Walked =>
      pipe(
        children.reduce<
          Readonly<{
            nodes: ReadonlyArray<Html<never>>;
            offset: number;
          }>
        >(
          (
            acc: Readonly<{
              nodes: ReadonlyArray<Html<never>>;
              offset: number;
            }>,
            child: Marker,
          ) =>
            pipe(
              child(acc.offset),
              (walked: Walked) => ({
                nodes: [
                  ...acc.nodes,
                  walked.node,
                ],
                offset: walked.offset,
              }),
            ),
          { nodes: [], offset },
        ),
        (folded: {
          nodes: ReadonlyArray<Html<never>>;
          offset: number;
        }): Walked => ({
          node: el(tag, attributes, folded.nodes),
          offset: folded.offset,
        }),
      ),
  text:
    (value: SoftStr): Marker =>
    (offset: number): Walked =>
      pipe(
        {
          from: Math.max(start - offset, 0),
          to: Math.min(
            end - offset,
            value.length,
          ),
        },
        (range: {
          from: number;
          to: number;
        }): Walked => ({
          node:
            range.from < range.to
              ? markedText(
                  value,
                  range.from,
                  range.to,
                )
              : text(value),
          offset: offset + value.length,
        }),
      ),
  raw:
    (html: SoftStr): Marker =>
    (offset: number): Walked => ({
      node: raw(html),
      offset,
    }),
});

/**
 * Mark the passage `span` in a rendered document, or
 * refuse: an empty, absent or ambiguous quotation returns
 * the typed {@link LocateError} and NOTHING is marked.
 */
export const markSpan = (
  body: Html<never>,
  span: SoftStr,
): Result<Html<never>, LocateError> =>
  pipe(
    locateOnce(textOf(body), span),
    mapResult(
      (found: Located): Html<never> =>
        foldHtml(
          markAlgebra(found.start, found.end),
        )(body)(0).node,
    ),
  );

/**
 * The document as a column shows it: marked when the URL
 * asked for a passage AND that passage is in the document
 * exactly once; otherwise the document, unchanged. A
 * refusal is not an error page — the reader still gets the
 * document, they simply do not get a false highlight.
 */
export const markedBody = (
  body: Html<never>,
  span: Option<SoftStr>,
): Html<never> =>
  pipe(
    span,
    matchOption(
      (): Html<never> => body,
      (quoted: SoftStr): Html<never> =>
        pipe(
          markSpan(body, quoted),
          matchResult(
            (): Html<never> => body,
            (marked: Html<never>): Html<never> =>
              marked,
          ),
        ),
    ),
  );
