# plgg-view — Build a view from data

Pass a tag, attributes, and children to `el`, and use `text` for a text node. `renderToString` serializes the tree to HTML. For an interactive screen, derive the view from a model and pass messages to `update` to obtain the next model. Try both rendering paths in the [to-do example](/packages/example/).

```ts
import { el, renderToString, text } from "plgg-view";

console.log(renderToString(el("p", [], [text("A & B")])));
// <p>A &amp; B</p>
```
