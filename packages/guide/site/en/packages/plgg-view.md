# plgg-view — Build a view from data

Pass a tag, attributes, and children to `el`, and use `text` for a text node. `renderToString` serializes the tree to HTML. For an interactive screen, derive the `view` from a model and pass messages to `update` to obtain the next model. Try both rendering paths in the [to-do example](/packages/example/).

```ts
import {
  el,
  renderToString,
  text,
} from "plgg-view";

console.log(
  renderToString(el("p", [], [text("A & B")])),
);
// <p>A &amp; B</p>
```

## Working with the API

`renderToString(node: Html<Msg>) → SoftStr`

Render the same `view` to a string on the server and derive it repeatedly from the model in the browser. Serialized HTML carries no click handlers. Start the client program for an interactive screen.

## Decide when an effect starts

`cmdEffect` from plgg-view/client wraps a function that produces `Promise`<Msg> when invoked. The `update` function returns the work as data without starting the request. Use `cmdNone`() in branches without effects. A test can inspect the model and command variant without sending a request.
