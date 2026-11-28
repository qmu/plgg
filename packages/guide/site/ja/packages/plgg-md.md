# plgg-md — Markdown から本文と見出しを取り出す

`renderMarkdown` は Markdown を読み、成功すると本文の `Html`、見出しの一覧、リンク先、frontmatter を返します。目次を作るときは `headings` の `text` と `slug` を使えば、本文と同じ見出しを指せます。コードに色を付けるには [plgg-highlight](/packages/plgg-highlight/) を組み合わせます。

```ts
import { isOk } from "plgg";
import { renderMarkdown } from "plgg-md";

const doc = renderMarkdown("# Book list");
if (isOk(doc))
  console.log(doc.content.headings[0]?.slug); // book-list
```

## 使い方と制約

`renderMarkdown(source) → Result<MarkdownDoc, InvalidError>`

見出しの一覧と本文を別々に解析すると、同じ見出しが続いたときにリンク先がずれます。一度の解析結果から本文と目次の両方を組み立てます。最終的に HTML 文字列が必要なら本文の `Html` を plgg-view のレンダラーに渡します。

## 見出しだけ必要な場合と本文が必要な場合

属性の読み取りだけなら `parseFrontmatter`(source) を使えます。見出し、リンク先、本文を一緒に使う画面には `renderMarkdown` が向いています。既定では生の HTML は無効なので、原稿の山括弧はテキストとして扱われます。リンクを別のベースパスに載せる場合は解決関数を渡します。
