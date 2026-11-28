# guide — このサイトをビルドする

原稿は site/ja と site/en にあり、同じ相対パスが対応する章です。`site.config.ts` は言語別の base と同じ形のサイドバーを組み立てます。作業中は `npm run dev`、両言語とリンクを確認するには `npm run build` を使います。最後に `nest-exhibit.ts` が plggmatic のビルド済み展示をコピーします。前提となるライブラリと展示はリポジトリ直下の `sh scripts/build.sh` で用意します。

## 原稿を一枚追加する

両言語の同じ相対パスに Markdown を置きます。リンクには /en/ を手で付けず、たとえば英語版でも /tutorial/ を指定します。ビルド時に base が適用されるためです。`site.config.ts` の sidebar に対応する経路を加え、生成後は目次から両方の版を開いて確かめます。
