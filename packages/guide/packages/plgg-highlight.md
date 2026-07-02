# plgg-highlight

**Syntax highlighting with zero new dependencies**, built
from scratch on [plgg](/packages/plgg/). It plugs into
[plgg-md](/packages/plgg-md)'s `Highlighter` seam and
drives the already-present `typescript` compiler's
`ts.createScanner` to tokenize TS / TSX / JS / JSX / JSON
into classified [plgg-view](/packages/plgg-view)
`Html<never>` spans — with an escaped `<pre><code>`
fallback for everything else.

## Why it exists

plgg-md renders code fences through a `Highlighter` seam
but stays language-agnostic itself. plgg-highlight fills
that seam for the TypeScript family by reusing the
compiler the monorepo already ships — no `highlight.js`,
no `shiki`, no new dependency:

```
plgg ── plgg-md ── plgg-highlight
          (Highlighter seam)  └── typescript scanner
```

## How it's organized

- **Lang** — alias-normalizes a fence language (`ts`,
  `tsx`, `js`, `jsx`, `json`) to the scanner's mode; an
  unknown language selects the fallback.
- **Token** — drives `ts.createScanner` to walk the
  source into classified tokens.
- **Render** — folds those tokens into
  [plgg-view](/packages/plgg-view) `Html<never>` spans,
  degrading to an escaped `<pre><code>` block when no
  language matches.

The output is a [plgg-view](/packages/plgg-view) tree, so
highlighted code composes into a page the same way any
other view does. The exact token classes and the class
names live in the `plgg-highlight` source.
