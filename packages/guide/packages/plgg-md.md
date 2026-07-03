# plgg-md

A **Markdown-to-typed-data parser**, built from scratch
on [plgg](/packages/plgg/). A layout-marker frontmatter
splitter and a block tokenizer for the
[plggpress](/packages/plggpress) Markdown subset produce
an immutable [`Box`](/concepts/tagged-data)-union AST —
[`Result`](/concepts/result), never a throw. It underpins
plggpress content parsing.

## Writing an app with it

Markdown source in, a rendered page out — as one
[`pipe`](/concepts/composition). The parse is a
[`Result`](/concepts/result): malformed input is a value
on the error channel matched **by name**, never a throw,
and success is pure data you serialize:

```typescript
import { pipe, matchResult } from "plgg";
import { renderToString } from "plgg-view";
import {
  renderMarkdown,
  type MarkdownDoc,
} from "plgg-md";

const render = (source: string) =>
  pipe(
    renderMarkdown(source),
    // Result<MarkdownDoc, InvalidError>
    matchResult(
      // malformed input → a safe fallback
      () => "<p>could not render</p>",
      // parsed → pure data; the body is an
      // Html<never> tree ready to serialize
      (doc: MarkdownDoc) =>
        renderToString(doc.body),
    ),
  );
```

Because the tree is just data — no HTML string, no
throw — the same `MarkdownDoc` renders to
[plgg-view](/packages/plgg-view) `Html`, and its flat
`links`/`slugs`/`headings` surfaces feed plggpress's
tooling directly.

## Vocabulary

The parser is grouped by pipeline stage, each stage a
pure step returning a [`Result`](/concepts/result):

- **Frontmatter** — `parseFrontmatter`, the layout-marker
  splitter that peels a page's frontmatter off its body
  into a `ParsedDocument`.
- **Block** — `parseBlocks`, the block tokenizer that
  turns the body into the
  [`Box`](/concepts/tagged-data)-union `Block` AST
  (headings, lists, fenced code, …).
- **Inline** — `renderInline`, inline-span tokenizing
  within a block.
- **Render** — `renderMarkdown` (default seams) and
  `renderMarkdownWith` (inject a `Highlighter` /
  `LinkResolver`) fold source into a `MarkdownDoc`;
  `mdToHtml` / `blockToHtml` fold `Block`s into
  [plgg-view](/packages/plgg-view) `Html`; `slugify`
  stamps heading anchors.

Every node is a `Box` union and every step returns a
[`Result`](/concepts/result), so malformed input is a
value to handle, not an exception. The exact node types
and the tokenizer's grammar live in the `plgg-md` source.

## Why it exists

plggpress needs Markdown as *data* it can render through
[plgg-view](/packages/plgg-view), not as an opaque HTML
string. plgg-md parses source text into a typed tree so
the render step is a pure fold:

```
plgg ── plgg-md ── plggpress
          └── renders to plgg-view Html
```

## How it's organized

- **Frontmatter** — the layout-marker splitter that peels
  a page's frontmatter off its body.
- **Block** — the block tokenizer that turns the body
  into the [`Box`](/concepts/tagged-data)-union AST
  (headings, lists, fenced code, …).
- **Inline** — inline-span tokenizing within a block.
- **Render** — folds the AST into a
  [plgg-view](/packages/plgg-view) `Html` tree.

Because the AST is a `Box` union and every step returns a
[`Result`](/concepts/result), malformed input is a value
to handle, not an exception. The exact node types and the
tokenizer's grammar live in the `plgg-md` source.
