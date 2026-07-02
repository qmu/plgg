# plgg-highlight

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

**Syntax highlighting with zero new dependencies**, built from
scratch on [plgg](../plgg/). It fills
[`plgg-md`](../plgg-md/)'s `Highlighter` seam for the
TypeScript family — TS / TSX / JS / JSX / JSON — by driving the
already-present `typescript` compiler's `ts.createScanner`,
emitting classified [`plgg-view`](../plgg-view/) `Html<never>`
spans. Anything it can't highlight falls back to an escaped
`<pre><code>` block.

## Why this package exists

plgg-md renders code fences through a `Highlighter` seam but
stays language-agnostic itself. plgg-highlight supplies that
seam by reusing the compiler the monorepo already ships — no
`highlight.js`, no `shiki`, no new dependency:

```
plgg ── plgg-md ── plgg-highlight
          (Highlighter seam)  └── typescript scanner
```

## How it's organized

- **Lang** — alias-normalizes a fence language (`ts`, `tsx`,
  `js`, `jsx`, `json`) to a scanner mode; an unknown language
  selects the fallback.
- **Token** — drives `ts.createScanner` to walk the source
  into classified tokens.
- **Render** — folds those tokens into
  [`plgg-view`](../plgg-view/) `Html<never>` spans, degrading
  to an escaped `<pre><code>` block when no language matches.

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root
  `CLAUDE.md`).
- `typescript` is a peer dependency — the same compiler the
  rest of the toolchain vendors, so no new dependency is
  added.
- After editing a `file:`-linked dependency's source, rebuild
  its `dist` or this package won't see new exports.
