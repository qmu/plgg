# 静的ファイルをビルドして公開する

`npx plggpress build --contentDir docs --outDir dist` を実行すると、[リンクとモデルの検証](/checks/)を通ったページが `dist` に書き出されます。出力先はビルドのたびに作り直すので、専用のディレクトリを指定します。`docs/public` の中身は出力先にコピーされ、`404.html` と、使用した部品の JavaScript も生成されます。

このガイドは `packages/plggpress` で `npm run build:site` を実行して生成します。日本語を `dist-site` に書いてから、英語を `dist-site/en` に書きます。逆の順序ではルートのビルド時に英語版が消えます。公開するディレクトリは、両方が入った `dist-site` です。

## Cloudflare に配信する

このサイトは Cloudflare Workers の静的アセット配信を使っています。自分のサイトで `dist` を配信するには、たとえば次の `wrangler.jsonc` をビルドを実行したディレクトリに置きます。名前は自分の Worker に合わせます。

```json
{
  "name": "field-handbook",
  "compatibility_date": "2026-08-01",
  "assets": {
    "directory": "./dist",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page"
  }
}
```

Wrangler で配信先のアカウントにログインし、ビルド後に `npx wrangler deploy` を実行します。独自ドメインを使う場合は、このサイトのように `routes` に `pattern` と `custom_domain: true` を設定します。

## フレームの許可を配信に反映する

`embedders` に相手を登録すると、ビルドは出力先の `_headers` に `/*` 用の `Content-Security-Policy: frame-ancestors 'self' …` を書きます。原稿の `public/_headers` があれば、それをコピーしてから規則を追記します。このガイドのルートの規則は `/en/` にも及びます。

配信後にブラウザーのネットワークパネルで HTML のレスポンスヘッダーを確認します。`_headers` を解釈しない配信先では、同じヘッダーをサーバー側に設定してください。[サイトをつなぐ](/joining/)で、相手側に必要な設定も確認できます。
