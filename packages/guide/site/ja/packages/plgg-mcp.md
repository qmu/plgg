# plgg-mcp — ツールを MCP で公開する

ツールの名前、説明、入力スキーマ、実行関数を `ToolRegistry` にまとめます。`dispatchMcp` は `initialize`、`tools/list`、`tools/call` を受け付けるので、クライアントは一覧からツールを選び、名前を指定して呼び出せます。標準入出力で提供するには `runStdioServer` を使います。コンテンツ管理用のツールは [plgg-cms](/packages/plgg-cms/) にあります。
