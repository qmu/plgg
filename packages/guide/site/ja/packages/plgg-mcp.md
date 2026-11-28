# plgg-mcp — ツールを MCP で公開する

ツールの名前、説明、入力スキーマ、実行関数を `ToolRegistry` にまとめます。`dispatchMcp` は `initialize`、`tools/list`、`tools/call` を受け付けるので、クライアントは一覧からツールを選び、名前を指定して呼び出せます。標準入出力で提供するには `runStdioServer` を使います。コンテンツ管理用のツールは [plgg-cms](/packages/plgg-cms/) にあります。

## 使い方と制約

`dispatchMcp(tools, serverInfo)(request) → Promise<RpcResponse>`

tools/list は宣言した inputSchema をクライアントに返します。tools/call で届く arguments は依然 unknown なので、各ツールの call が入力を検証します。失敗を画面に伝えるには errorResult、通常のテキストには textResult を使います。

```ts
import { some } from "plgg";
import { dispatchMcp } from "plgg-mcp";

const dispatch = dispatchMcp([], {
  name: "library",
  version: "1",
});
console.log(
  await dispatch({
    id: some(1),
    method: "tools/list",
    params: {},
  }),
);
```

## 二種類の失敗を見分ける

ディスパッチャーが知らないメソッドやツール名には JSON-RPC のエラーが返ります。ツールは見つかったものの業務上の条件を満たさなければ、errorResult(message) で ToolResult の isError を立てられます。後者は RPC 自体としては成功なので、応答の外側のタグだけを見ても区別できません。
