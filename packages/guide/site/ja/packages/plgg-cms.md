# plgg-cms — コンテンツを配信・管理する

記事を検索したり、管理画面から編集したりするには、常駐する `plgg-cms` サーバーを使います。コンテンツの索引、読み取り用 API、メディア管理を備えています。編集者のログインには [plgg-auth](/packages/plgg-auth/)、ツール呼び出しには [MCP](/packages/plgg-mcp/) を使います。

`site.config.ts` と原稿ディレクトリ `docs` がある場合、`npx plgg-cms serve --contentDir docs` で起動します。ルートに配信する構成なら、コレクションの一覧は `/api/collections`、管理画面は `/admin` から開けます。

Markdown を静的ファイルとして公開する手順は [plggpress ガイド](https://plggpress.qmu.co.jp/operations/) にあります。
