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

## Frontmatter YAML subset (and its bounds)

The frontmatter parser accepts a **deliberately bounded**
YAML subset — fail-closed against untrusted author input.
`Yaml/model/YamlValue.ts` is the normative spec; in short, a
document is a map whose values are scalars, a sequence of
scalars (`- item` block or `[a, b]` flow), a **one-level**
map of scalars (block or `{a: 1}` flow), or nothing. Nothing
deeper: `[[a]]`, `[{a: 1}]`, `{a: [b]}`, and `- [a]` are all
parse errors, by construction rather than a depth check.

**List-of-list metadata is not supported.** A common shape in
other ecosystems — per-page `head:` metadata written as a
sequence of `[tag, attrs]` pairs, as VitePress uses — is a
sequence whose items are themselves collections, which the
one-level bound refuses (with a message pointing at this
limitation). This is intentional: widening the model to hold
it would reintroduce unbounded depth.

**Supported alternative:** express such metadata as **named
scalar keys** and let the rendering layer assemble the
`<head>` tags from them — the flat map the subset already
models. For example, instead of

```yaml
# rejected — a nested sequence
head:
  - [meta, description, "A page"]
  - [link, canonical, "https://…"]
```

write

```yaml
# accepted — named scalar keys
description: "A page"
canonical: "https://…"
```

and build the tags from `description`/`canonical` in the
template.

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root
  `CLAUDE.md`); the parser narrows with plgg type guards,
  `Option`, and `Result`.
- After editing `plgg` or `plgg-view` core, rebuild its `dist`
  or this package won't see new exports.
