# 最初のサイトを作る

ここでは Node.js と npm を使い、2 ページの手引きを作ります。初めて plgg を使う場合は、次のコマンドでソースを取得し、付属のスクリプトで依存パッケージと CLI を準備します。

```sh
git clone https://github.com/qmu/plgg.git
cd plgg
sh scripts/build.sh
```

準備済みのチェックアウトがあれば、そのルートから始められます。手引きの原稿を置くディレクトリを作りましょう。

```sh
mkdir -p handbook/docs
cd handbook
```

`site.config.ts` を作ります。`base` は公開先のパスです。目次にはトップへのリンクを一つ置きます。

```ts
export default {
  title: "Handbook",
  description: "A field guide",
  base: "/",
  nav: [],
  sidebar: [{ text: "Handbook", items: [
    { text: "Home", link: "/", items: [] },
  ] }],
  social: [],
  dev: { allowedHosts: [] },
};
```

`docs/index.md` がトップページになります。もう一つのファイルを同じディレクトリに置き、トップページの本文からリンクします。

```sh
printf '# Handbook\n\n[Supplies](./supplies.md)\n' > docs/index.md
printf '# Supplies\n\nPack a pencil and a notebook.\n' > docs/supplies.md
npx plggpress dev --contentDir docs
```

ブラウザーで `http://localhost:5173/` を開き、**Supplies** を選びます。右に持ち物のページが開いたら、`docs/supplies.md` の本文を書き換えて保存してください。ブラウザーが更新されます。

開発サーバーを Ctrl+C で止めて、次のコマンドを実行します。`dist/index.html` と `dist/supplies/index.html` ができれば完成です。[Markdown とリンク](/markdown/)では、ページが増えたときのリンクの書き方を説明します。

```sh
npx plggpress build --contentDir docs --outDir dist
```
