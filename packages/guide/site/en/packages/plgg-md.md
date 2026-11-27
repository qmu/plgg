# plgg-md — Read a Markdown body and its headings

`renderMarkdown` returns a document containing the body as `Html`, along with headings, link destinations, and frontmatter. To build a table of contents, use each heading’s `text` and `slug` so links point to the IDs in the body. Add [plgg-highlight](/packages/plgg-highlight/) to color code blocks.

```ts
import { isOk } from "plgg";
import { renderMarkdown } from "plgg-md";

const doc = renderMarkdown("# Book list");
if (isOk(doc)) console.log(doc.content.headings[0]?.slug); // book-list
```
