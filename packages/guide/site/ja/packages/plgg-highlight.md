# plgg-highlight — コードブロックに色を付ける

`asHighlighter()` が返す関数を [plgg-md](/packages/plgg-md/) の `renderMarkdownWith` に渡します。TypeScript、TSX、JavaScript、JSX、JSON のフェンスでトークンごとの要素が作られます。言語が不明なときも、コードをエスケープしたテキストとして読めます。

```ts
import { asHighlighter } from "plgg-highlight";
import {
  identityResolver,
  renderMarkdownWith,
} from "plgg-md";

const render = renderMarkdownWith(
  asHighlighter(),
  identityResolver,
);
const page = render(
  "```ts\nconst copies = 2;\n```",
);
```

## 使い方と制約

`asHighlighter() → Highlighter`

色を付ける段階は Markdown の構文解析とは独立しています。`renderMarkdownWith` にハイライターとリンク解決関数を渡すと、文書を変えずにコードフェンスの描画を差し替えられます。未対応の言語も本文から消えず、エスケープしたコードとして表示されます。

## 色を付ける前後を切り分ける

色が付かないときは、まずフェンスの言語名を確認します。次に Markdown 側で既定の `renderMarkdown` を呼んでいないか調べます。既定のレンダラーはプレーンなコード表示を使います。`asHighlighter`() で得た関数を渡した版と同じ入力で比較すれば、原稿側の問題かレンダラーの設定かを絞れます。
