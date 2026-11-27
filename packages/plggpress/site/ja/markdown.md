# Markdown とリンク

原稿のディレクトリに `index.md` を置くとトップページになります。`notes/tools.md` は `/notes/tools/`、`notes/index.md` は `/notes/` になります。ページの最初の `#` 見出しは、列の表題とブラウザーのタブに使われます。

## ページや見出しを指す

同じフォルダーの原稿には `[Tools](./tools.md)` と書きます。サイトの先頭から指定する場合は `[Tools](/notes/tools/)` です。公開先が `/en/` なら、どちらも英語版の中を指します。読者がどの列から開いてもリンク先は同じです。

見出し `## Packing list` には `[List](#packing-list)` とリンクできます。他のページからはパスの後に `#packing-list` を付けます。見出しを改名したら[ビルド時の検査](/checks/)で参照元を確かめます。

## コードと注記を書く

コードはバッククォートで囲み、開始行に言語名を書くと構文に応じて色が付きます。補足には `::: tip`、注意には `::: warning`、特に重要な警告には `::: danger` が使えます。たとえば次のように書きます。

~~~~markdown
```ts
const copies = 2;
```

::: tip
Keep a spare copy.
:::
~~~~

画像はたとえば `public/images/kit.png` に置き、`![持ち物](/images/kit.png)` で参照します。操作できる図を載せるには、[図の埋め込み](/sheets/)に進んでください。
