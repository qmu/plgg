# 目次と外観を整える

サイドバーは `sidebar` に書いた順に表示されます。最上位は章、その下の `items` はページや小見出しです。リンクを持たない項目は見出しとして使えます。末端にも `items: []` を書きます。

たとえば[最初のサイト](/start/)の目次に持ち物のページを加えてみましょう。`site.config.ts` のデフォルトエクスポートより前に次の定義を置き、設定の `sidebar` を `...navigation` に置き換えます。

```ts
const navigation = {
  sidebarStyle: "tree",
  sidebarGroups: "toggle",
  controls: "sidebar",
  sidebar: [{ text: "Handbook", items: [
    { text: "Home", link: "/", items: [] },
    { text: "Supplies", link: "/supplies/", items: [] },
  ] }],
};
```

`tree` は一列にツリーを表示し、`toggle` は章を開閉できるようにします。`numbered` はツリーの項目に番号を振り、`plain` は選んだ章を隣の列に展開します。`controls: "sidebar"` で明暗の切り替えとソーシャルリンクを目次の下にまとめられます。

## 幅とスキン

本文中心なら既定の `contentWidth: "measure"` を使います。図やカタログなら `"fill"` にすると、開いているページが残りの幅を分け合います。配色を指定する `theme` は `light` と `dark` のパレットを受け取ります。`appearance` には書体、角の丸み、余白、動きなどをまとめたスキンを渡します。たとえば `import { soft } from "plggmatic";` を設定ファイルに加え、`appearance: soft` を指定します。[plggmatic のカタログ](https://plggmatic.qmu.co.jp/)で部品やレイアウトを確認できます。

## 言語ごとの公開先

このガイドでは、日本語と英語で同じ名前の原稿を別のフォルダーに置きます。ビルド時に `SITE_LOCALE` を設定ファイルで読み、タイトル、説明、目次、`base` を選びます。日本語の `base` は `/`、英語は `/en/` です。本文では同じ内部パスを使い、目次の末尾からもう一方の言語に移れます。[公開の手順](/operations/)も参照してください。
