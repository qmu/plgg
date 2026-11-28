# plgg-cms — コンテンツを配信・管理する

記事を検索したり、管理画面から編集したりするには、常駐する `plgg-cms` サーバーを使います。コンテンツの索引、読み取り用 API、メディア管理を備えています。編集者のログインには [plgg-auth](/packages/plgg-auth/)、ツール呼び出しには [MCP](/packages/plgg-mcp/) を使います。

`site.config.ts` と原稿ディレクトリ `docs` がある場合、`npx plgg-cms serve --contentDir docs` で起動します。ルートに配信する構成なら、コレクションの一覧は `/api/collections`、管理画面は `/admin` から開けます。

Markdown を静的ファイルとして公開する手順は [plggpress ガイド](https://plggpress.qmu.co.jp/operations/) にあります。

## 使い方と制約

`contentApi(db, embedder) → Web`

コンテンツを索引に取り込んでおくと、読み取り API と管理画面で同じ文書を参照できます。`contentApi` は DB を受け取る読み取り用の `Web` です。編集や認証も提供する場合はサーバー全体の構成が必要です。ファイルを配るだけなら静的ビルドで足ります。

```ts
import { asListQuery } from "plgg-cms";

console.log(
  asListQuery({ orderBy: "title", limit: "5" }),
);
console.log(asListQuery({ limit: "-1" }).__tag);
```

## 一覧の条件を検証する

`asListQuery`(params) は省略された項目に既定値を補います。並べ替えのキーは title または updated_at、順序は asc または desc です。limit を負数にした場合は既定値に戻さず検証エラーを返します。API で空の一覧が返った場合と、問い合わせの指定を直すべき場合を分けられます。
