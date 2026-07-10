# plgg-highlight

**Syntax highlighting with zero runtime dependencies**,
built from scratch on [plgg](/packages/plgg/). It plugs
into [plgg-md](/packages/plgg-md)'s `Highlighter` seam and
uses an in-house [plgg-parser](/packages/plgg-parser)
grammar to tokenize TS / TSX / JS / JSX / JSON into
classified [plgg-view](/packages/plgg-view) `Html<never>`
spans — with an escaped `<pre><code>` fallback for
everything else.

## Writing an app with it

plgg-md renders code fences through a `Highlighter` seam
but ships no compiler. `asHighlighter()` fills that seam
for the TypeScript family, so a Markdown render gains real
token spans — as one [`pipe`](/concepts/composition),
where a parse failure is a [`Result`](/concepts/result)
value matched **by name**, never a throw:

```typescript
import { pipe, matchResult } from "plgg";
import { renderToString } from "plgg-view";
import {
  renderMarkdownWith,
  identityResolver,
} from "plgg-md";
import { asHighlighter } from "plgg-highlight";

// asHighlighter() satisfies plgg-md's
// Highlighter seam using plgg-parser grammar data.
const render = renderMarkdownWith(
  asHighlighter(),
  identityResolver,
);

const html = pipe(
  "```ts\nconst x = 1\n```",
  render, // Result<MarkdownDoc, InvalidError>
  matchResult(
    // failure is a value, not a throw
    (err) => err.content.message,
    // ok → classed <pre><code> spans
    (doc) => renderToString(doc.body),
  ),
);
```

Because the highlighter is just an injected function over
pure plgg data, the same seam takes the plain fallback for
any non-TS fence — the tree it returns composes into a page
the same way any other [plgg-view](/packages/plgg-view)
does.

## Vocabulary

The package offers three small concerns of pure plgg data,
mirroring its module layout:

- **Lang** — `TokenLang` (a bounded `ts`/`tsx`/`js`/`jsx`/
  `json` string union) and `TOKEN_LANG_ALIAS`, folded by
  `normalizeLang` from a raw fence
  [`Option<SoftStr>`](/concepts/option) to a `TokenLang`
  (`None` selects the fallback).
- **Token** — `Token` and its `TokenKind` (a nine-icon
  [`Box`](/concepts/tagged-data) union: `Keyword`,
  `String`, `Number`, `Comment`, `Identifier`,
  `Punctuation`, `Regex`, `Template`, `Plain`) with
  `keyword`/`stringKind`/… constructors and their
  `$`-matchers (`keyword$()`); `tokenize` walks source
  into a `Token` stream.
- **Render** — `asHighlighter` (the `plgg-md` seam
  implementation), plus `highlightTs` and `highlightPlain`
  for the two branches it dispatches between.

Everything is pure plgg data: lookups are
[`Option`](/concepts/option), unions are
[`Box`](/concepts/tagged-data), and token kinds are matched
**by name** through an exhaustive
[`match`](/concepts/composition), never by tag string. The
exact token classes and the class names live in the
`plgg-highlight` source.

## Why it exists

plgg-md renders code fences through a `Highlighter` seam
but stays language-agnostic itself. plgg-highlight fills
that seam for the TypeScript family with a parser built in
the plgg family — no `highlight.js`, no `shiki`, and no
runtime `typescript` dependency:

```
plgg ── plgg-md ── plgg-highlight
          (Highlighter seam)  └── plgg-parser TS grammar
```

## How it's organized

- **Lang** — alias-normalizes a fence language (`ts`,
  `tsx`, `js`, `jsx`, `json`) to a tokenizer mode; an
  unknown language selects the fallback.
- **Token** — a `plgg-parser` grammar walks the source
  into classified tokens.
- **Render** — folds those tokens into
  [plgg-view](/packages/plgg-view) `Html<never>` spans,
  degrading to an escaped `<pre><code>` block when no
  language matches.

The output is a [plgg-view](/packages/plgg-view) tree, so
highlighted code composes into a page the same way any
other view does. The exact token classes and the class
names live in the `plgg-highlight` source.
