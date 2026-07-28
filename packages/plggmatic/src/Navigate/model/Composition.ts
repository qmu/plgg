import {
  type SoftStr,
  type Option,
  none,
} from "plgg";

/**
 * ONE open document in the strip: the route it was read
 * from, and — optionally — the verbatim passage inside it
 * the reader's attention was sent to.
 *
 * The span is deliberately the document's OWN text rather
 * than an offset or a heading id: it is located in the
 * document exactly once or not at all, so a passage that
 * was paraphrased instead of quoted cannot address
 * anything (the `edit_doc` locator's contract, reused).
 */
export type Column = Readonly<{
  route: SoftStr;
  span: Option<SoftStr>;
}>;

/**
 * The screen, modelled ONCE: an ordered list of columns,
 * left to right. `head` is the document the URL's own path
 * names — so every composition is also an ordinary,
 * self-sufficient page — and `rest` are the columns opened
 * to its right.
 *
 * Non-empty BY CONSTRUCTION. There is no empty composition
 * to defend against anywhere downstream, which is why the
 * head is a field rather than `list[0]`.
 *
 * The load-bearing decision of the strip is that this is
 * not a trail. Following a link is merely the case where
 * `rest` grew by one; a set of columns an assistant
 * assembled from documents that link to nothing is the
 * same value, arriving by a different route.
 */
export type Composition = Readonly<{
  head: Column;
  rest: ReadonlyArray<Column>;
}>;

/** One column at a route, with no passage marked. */
export const columnOf = (
  route: SoftStr,
): Column => ({ route, span: none() });

/** One column at a route, with a passage marked. */
export const columnWithSpan = (
  route: SoftStr,
  span: Option<SoftStr>,
): Column => ({ route, span });

/** The composition showing one document and nothing else. */
export const soloComposition = (
  route: SoftStr,
): Composition => ({
  head: columnOf(route),
  rest: [],
});

/**
 * The composition as a plain left-to-right list — the form
 * a renderer walks. Reconstructing the head/rest split from
 * it is never necessary, so this is one-way on purpose.
 */
export const columnsOf = (
  composition: Composition,
): ReadonlyArray<Column> => [
  composition.head,
  ...composition.rest,
];
