# plgg-highlight — Highlight fenced code

Pass the function returned by `asHighlighter()` to [plgg-md](/packages/plgg-md/)’s `renderMarkdownWith`. TypeScript, TSX, JavaScript, JSX, and JSON fences produce elements for individual tokens. An unrecognized fence language falls back to escaped code text.

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

## Working with the API

`asHighlighter() → Highlighter`

Highlighting is independent of Markdown parsing. Give `renderMarkdownWith` the highlighter and link resolver to replace fence rendering without rewriting the document. Unsupported languages still produce escaped code.

## Separate tokenization from rendering

For an uncolored fence, check the language label, then check whether the caller used the default renderMarkdown. The default uses plain code rendering. Compare the same source with `asHighlighter`() injected to distinguish a source-label issue from renderer setup.
