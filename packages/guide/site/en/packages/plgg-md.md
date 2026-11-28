# plgg-md — Read a Markdown body and its headings

`renderMarkdown` returns a document containing the body as `Html`, along with headings, link destinations, and frontmatter. To build a table of contents, use each heading’s `text` and `slug` so links point to the IDs in the body. Add [plgg-highlight](/packages/plgg-highlight/) to color code blocks.

```ts
import { isOk } from "plgg";
import { renderMarkdown } from "plgg-md";

const doc = renderMarkdown("# Book list");
if (isOk(doc))
  console.log(doc.content.headings[0]?.slug); // book-list
```

## Working with the API

`renderMarkdown(source) → Result<MarkdownDoc, InvalidError>`

Derive the body and table of contents from one document. Independent slug generation can disagree for repeated headings. If the destination needs an HTML string, serialize the body `Html` with plgg-view.

## Choose how far to parse

Use `parseFrontmatter`(source) to read the metadata boundary alone. Use `renderMarkdown` when a page needs headings, destinations and body together. Raw HTML is off by default, so angle brackets are escaped. Supply a link resolver when serving the same content under a different base.
