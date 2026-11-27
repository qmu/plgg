# plgg-auth — ログインを組み込む

OpenID Connect でログインするアプリには RP（ログインを依頼する側）の `beginLogin` と `completeLogin` があります。前者で認証を開始し、コールバックを受けた後に後者で完了します。

認証を提供する側には署名鍵、認可コード、セッションを扱う機能があります。状態をデータベースに保存する場合は `applyAuthSchema` でテーブルを準備し、`sqlStore` に [Db](/packages/plgg-sql/) を渡します。
