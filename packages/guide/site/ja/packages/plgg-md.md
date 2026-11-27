# plgg-md — Markdown から本文と見出しを取り出す

`renderMarkdown` は Markdown を読み、成功すると本文の `Html`、見出しの一覧、リンク先、frontmatter を返します。目次を作るときは `headings` の `text` と `slug` を使えば、本文と同じ見出しを指せます。コードに色を付けるには [plgg-highlight](/packages/plgg-highlight/) を組み合わせます。

```ts
import { isOk } from "plgg";
import { renderMarkdown } from "plgg-md";

const doc = renderMarkdown("# Book list");
if (isOk(doc)) console.log(doc.content.headings[0]?.slug); // book-list
```
