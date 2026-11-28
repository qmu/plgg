# plgg-auth — ログインを組み込む

OpenID Connect でログインするアプリには RP（ログインを依頼する側）の `beginLogin` と `completeLogin` があります。前者で認証を開始し、コールバックを受けた後に後者で完了します。

認証を提供する側には署名鍵、認可コード、セッションを扱う機能があります。状態をデータベースに保存する場合は `applyAuthSchema` でテーブルを準備し、`sqlStore` に [Db](/packages/plgg-sql/) を渡します。

## 使い方と制約

`beginLogin(config)() → Promise<Result<LoginStart, RpError>>`

ブラウザーには authorizeUrl を返し、verifier、state、nonce は同じログイン試行にひも付けて保持します。コールバックで `beginLogin` を呼び直すと照合に使う値が変わります。`completeLogin`(config, transport) にコールバックのクエリと保存した LoginStart を渡します。

```ts
import { asClientId } from "plgg-auth";

console.log(
  asClientId("").__tag,
  asClientId("library").__tag,
);
```

## コールバックをどこまで処理できたか

`completeLogin` は保存した state とコールバックの state をまず照合します。次に code の有無を確認し、保存した verifier でトークンを交換します。交換に成功しても、署名や issuer、audience、nonce の検証を通るまでは利用者の識別子を採用できません。テストで時計を渡すときは Unix 秒です。
