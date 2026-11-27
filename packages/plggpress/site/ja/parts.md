# コードブロックに部品を登録する

部品（part）は、特定の名前のコードブロックを HTML に変換します。そこにブラウザーでの操作を加える範囲を island と呼びます。ここでは、原文を表示しておき、JavaScript が使えるときだけ文字数を添える `word-note` を作ります。

## 表示を登録する

`site.config.ts` と同じ場所に `site.parts.ts` を置きます。`plgg-view` の `text` を使うと、入力に山括弧が含まれていても文字として表示できます。

```ts
import type { Part } from "plggpress";
import { el, text } from "plgg-view";

export default {
  parts: [{
    name: "word-note",
    render: (code) => el("pre", [], [text(code)]),
    css: '[data-island="word-note"] small { display: block }',
    runtime: "./word-note.js",
  }] satisfies readonly Part[],
};
```

## ブラウザーで動く処理を書く

設定ファイルの隣に `word-note.js` を作ります。ブラウザーで直接読める ES モジュールが必要です。`mount` には、その部品の要素と `{ code, info }` が渡ります。`info` は名前とオプションを含むフェンスの開始行の指定です。後始末の関数を返すと、列が取り除かれたときに呼ばれます。

```js
export default function mount(root, { code }) {
  const count = document.createElement("small");
  count.textContent = String(Array.from(code.trimEnd()).length);
  root.append(count);
  return () => count.remove();
}
```

ページに次のブロックを置いてビルドします。`runtime` は設定ファイルからの相対パスかパッケージ名で指定します。依存モジュールがある場合は、配布用にひとつのファイルにまとめておきます。

~~~~markdown
```word-note
Field notebook
```
~~~~

`name` は英数字、`_`、`-` で指定し、既存の名前で登録するとその部品を置き換えます。`lazy: true` では、オプションのないブロックの読み込みをポインターやフォーカスが届くまで待ちます。`tools` にはシートで使うツールの対応表を渡せます。図のほか、[plggmatic のカタログ](https://plggmatic.qmu.co.jp/)もこの方法で部品の実例を表示しています。
