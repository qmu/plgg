# plgg-md

A **Markdown-to-typed-data parser**, built from scratch
on [plgg](/packages/plgg/). A layout-marker frontmatter
splitter and a block tokenizer for the
[plggpress](/packages/plggpress) Markdown subset produce
an immutable [`Box`](/concepts/tagged-data)-union AST —
[`Result`](/concepts/result), never a throw. It underpins
plggpress content parsing.

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
