# plggpress — Markdown のサイトを作る

plggpress は Markdown を静的なページに変換するツールです。このガイドも plggpress で生成しています。手元で最初のサイトを作る手順は [plggpress ガイド](https://plggpress.qmu.co.jp/start/) で試せます。

## 使い方と制約

`defineSite(input: SiteConfigInput) → Result<SiteConfig, InvalidError>`

このガイドでは同じ設定ファイルで言語別に base とサイドバーを切り替えます。設定の検証、Markdown の解析、リンクの照合を通した後、静的ファイルとして配信できます。フロントマターに形式を課す場合は `contentModel` と `bindModel` で対象を指定します。公開後の編集や認証には別途 CMS が必要です。

```ts
import { defineSite } from "plggpress";

const site = defineSite({
  title: "Books",
  description: "Reading notes",
  base: "/",
  nav: [],
  sidebar: [],
  social: [],
  dev: { allowedHosts: [] },
});
console.log(site.__tag);
```

## ビルドで失敗したリンクを再現する

リンクの検査にはページの経路、見出しの ID、本文から出るリンクの三つが必要です。次の例では /books/ というページは存在しますが、末尾の #old に対応する見出しがありません。リンク先を #titles に直すと検査を通ります。ページ名が合っているのにビルドできないときは、移動や改題をした見出しも調べてください。

```ts
import { checkLinks, pageLinks } from "plggpress";

const books = pageLinks(
  "/books/",
  ["titles"],
  [],
);
const check = (href: string) =>
  checkLinks("/")([
    pageLinks("/", [], [href]),
    books,
  ]);
console.log(
  check("/books/#old").__tag,
  check("/books/#titles").__tag,
);
```
