# plgg-highlight — Highlight fenced code

Pass the function returned by `asHighlighter()` to [plgg-md](/packages/plgg-md/)’s `renderMarkdownWith`. TypeScript, TSX, JavaScript, JSX, and JSON fences produce elements for individual tokens. An unrecognized fence language falls back to escaped code text.

```ts
import { asHighlighter } from "plgg-highlight";
import { identityResolver, renderMarkdownWith } from "plgg-md";

const render = renderMarkdownWith(asHighlighter(), identityResolver);
const page = render("```ts\nconst copies = 2;\n```");
```
