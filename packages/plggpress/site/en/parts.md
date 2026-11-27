# Register a fence part

A part turns a named code fence into HTML. Its island is the element where a browser module can add interaction. Here’s a part called `word-note` that shows the original text and adds a character count when JavaScript is available.

## Register the static view

Put `site.parts.ts` next to `site.config.ts`. The `text` helper from `plgg-view` displays the source as text, including any angle brackets.

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

## Add the browser module

Save `word-note.js` beside the site config. Supply a browser-ready ES module. Its default export receives the island element and `{ code, info }`. The `info` string includes the fence name and any options. Return a cleanup function if there’s work to undo when the column is removed.

```js
export default function mount(root, { code }) {
  const count = document.createElement("small");
  count.textContent = String(Array.from(code.trimEnd()).length);
  root.append(count);
  return () => count.remove();
}
```

Build a page containing the fence below. Runtime paths are relative to the site config, or you can use a package specifier. Bundle dependencies into the browser file before building the site.

~~~~markdown
```word-note
Field notebook
```
~~~~

Use letters, digits, underscores, or hyphens in `name`. Reusing a registered name replaces that part. With `lazy: true`, an option-free fence waits for pointer, touch, or focus interaction before loading its module. A part can also supply a `tools` map for sheet controls. The [plggmatic catalog](https://plggmatic.qmu.co.jp/) uses a fence part to render its component examples.
