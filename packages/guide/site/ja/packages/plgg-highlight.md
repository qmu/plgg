# plgg-highlight — コードブロックに色を付ける

`asHighlighter()` が返す関数を [plgg-md](/packages/plgg-md/) の `renderMarkdownWith` に渡します。TypeScript、TSX、JavaScript、JSX、JSON のフェンスでトークンごとの要素が作られます。言語が不明なときも、コードをエスケープしたテキストとして読めます。

```ts
import { asHighlighter } from "plgg-highlight";
import { identityResolver, renderMarkdownWith } from "plgg-md";

const render = renderMarkdownWith(asHighlighter(), identityResolver);
const page = render("```ts\nconst copies = 2;\n```");
```
