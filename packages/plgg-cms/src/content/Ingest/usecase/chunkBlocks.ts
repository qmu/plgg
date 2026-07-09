import {
  type SoftStr,
  matchOption,
  match,
} from "plgg";
import {
  type Block,
  type ListItem,
  type HeadingLevel,
  isHeading,
  heading$,
  para$,
  codeFence$,
  list$,
  quote$,
  table$,
  callout$,
  thematicBreak$,
  htmlBlock$,
} from "plgg-md";
import { type Chunk } from "plgg-cms/content/Ingest/model/Chunk";

/** The plain search text of one list item (+ nested blocks). */
const itemText = (item: ListItem): SoftStr =>
  [
    item.text,
    ...item.children.map(blockText),
  ].join(" ");

/**
 * Projects one {@link Block} to plain search text —
 * exhaustive `match` over the whole `Block` union, so a new
 * block variant is a compile error here, never a silently
 * unindexed body. Structure (fences, tables, quotes,
 * callouts) is flattened to its words; that is all FTS5
 * needs, and it keeps matches scoped to the section.
 */
const blockText = (block: Block): SoftStr =>
  match(block)(
    [
      heading$(),
      ({ content }): SoftStr => content.text,
    ],
    [
      para$(),
      ({ content }): SoftStr => content.text,
    ],
    [
      codeFence$(),
      ({ content }): SoftStr => content.code,
    ],
    [
      list$(),
      ({ content }): SoftStr =>
        content.items.map(itemText).join(" "),
    ],
    [
      quote$(),
      ({ content }): SoftStr =>
        content.children
          .map(blockText)
          .join(" "),
    ],
    [
      table$(),
      ({ content }): SoftStr =>
        [content.header, ...content.rows]
          .map((row) => row.join(" "))
          .join(" "),
    ],
    [
      callout$(),
      ({ content }): SoftStr =>
        [
          matchOption<SoftStr, SoftStr>(
            () => "",
            (t: SoftStr) => t,
          )(content.title),
          ...content.children.map(blockText),
        ]
          .join(" ")
          .trim(),
    ],
    [thematicBreak$(), (): SoftStr => ""],
    [
      htmlBlock$(),
      ({ content }): SoftStr => content.html,
    ],
  );

/** A section under construction during the forward walk. */
type OpenHeading = Readonly<{
  level: HeadingLevel;
  text: SoftStr;
}>;

const pathOf = (
  stack: ReadonlyArray<OpenHeading>,
): SoftStr => stack.map((h) => h.text).join(" > ");

/**
 * Folds a document's flat {@link Block}[] into
 * heading-scoped {@link Chunk}s. Headings partition the
 * stream into NON-overlapping sections (each heading opens
 * a section that runs to the next heading of any level);
 * the ` > ` breadcrumb carries the hierarchy instead, so a
 * word is indexed under exactly one chunk. Content before
 * the first heading is chunk 0 with an empty `headingPath`.
 */
export const chunkBlocks = (
  blocks: ReadonlyArray<Block>,
): ReadonlyArray<Chunk> => {
  // Imperative forward walk (irreducible seam): a heading
  // stack tracks the ancestor breadcrumb while sections are
  // flushed at each heading boundary.
  const chunks: Array<Chunk> = [];
  const stack: Array<OpenHeading> = [];
  let buffer: Array<Block> = [];
  let ordinal = 0;

  const flush = (): void => {
    if (buffer.length === 0) {
      return;
    }
    chunks.push({
      ordinal,
      headingPath: pathOf(stack),
      text: buffer
        .map(blockText)
        .join("\n")
        .trim(),
    });
    ordinal += 1;
    buffer = [];
  };

  blocks.forEach((block: Block): void => {
    if (isHeading(block)) {
      flush();
      const level: HeadingLevel = block.content.level;
      // pop ancestors of equal-or-deeper level; the top
      // read returns undefined exactly when the stack
      // empties mid-pop (both sides are exercised).
      while (true) {
        const top = stack[stack.length - 1];
        if (top === undefined || top.level < level) {
          break;
        }
        stack.pop();
      }
      stack.push({
        level,
        text: block.content.text,
      });
    }
    buffer.push(block);
  });
  flush();

  return chunks;
};
