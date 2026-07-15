# plgg-md

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

A **Markdown-to-typed-data parser**, built from scratch on
[plgg](../plgg/). A bounded-YAML frontmatter parser and a
block tokenizer for the [`plggpress`](../plggpress/) Markdown
subset produce an immutable `Box`-union AST — a `Result`,
never a throw. It underpins plggpress content parsing.

## Why this package exists

plggpress needs Markdown as *data* it can render through
[`plgg-view`](../plgg-view/), not as an opaque HTML string.
plgg-md parses source text into a typed tree so the render
step is a pure fold:

```
plgg ── plgg-md ── plggpress
          └── renders to plgg-view Html
```

## How it's organized

- **Yaml** — the deliberately bounded YAML subset frontmatter
  is written in. `Yaml/model/YamlValue.ts`'s doc comment is
  the **normative spec** — read it before widening anything.
- **Frontmatter** — peels a page's frontmatter off its body
  and parses it through the subset.
- **Block** — the block tokenizer that turns the body into the
  `Box`-union AST (headings, lists, fenced code, …).
- **Inline** — inline-span tokenizing within a block.
- **Render** — folds the AST into a
  [`plgg-view`](../plgg-view/) `Html` tree, through the seams
  in `Render/model/seam.ts` (highlighter, link resolver,
  heading slugger, heading element).

Because the AST is a `Box` union and every step returns a
`Result`, malformed input is a value to handle, not an
exception.

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root
  `CLAUDE.md`); the parser narrows with plgg type guards,
  `Option`, and `Result`.
- After editing `plgg` or `plgg-view` core, rebuild its `dist`
  or this package won't see new exports.
