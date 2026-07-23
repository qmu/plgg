# plgg-highlight

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

**Syntax highlighting with zero dependencies**, built from
scratch on [plgg](../plgg/). It fills
[`plgg-md`](../plgg-md/)'s `Highlighter` seam for the
TypeScript family — TS / TSX / JS / JSX / JSON — by tokenizing
the source with an in-house [`plgg-parser`](../plgg-parser/)
grammar, emitting classified [`plgg-view`](../plgg-view/)
`Html<never>` spans. Anything it can't highlight falls back to
an escaped `<pre><code>` block.

## Why this package exists

plgg-md renders code fences through a `Highlighter` seam but
stays language-agnostic itself. plgg-highlight supplies that
seam with an in-house parser — no `highlight.js`, no `shiki`,
and (since the plgg-parser migration) no `typescript`
dependency either:

```
plgg ── plgg-md ── plgg-highlight
          (Highlighter seam)  └── plgg-parser TS grammar
```

## How it's organized

- **Lang** — alias-normalizes a fence language (`ts`, `tsx`,
  `js`, `jsx`, `json`) to a tokenizer mode; an unknown
  language selects the fallback.
- **Token** — a `plgg-parser` grammar walks the source into
  classified tokens (context-tracking `/` for regex vs.
  division), preserving trivia so the tokens round-trip to the
  exact input.
- **Render** — folds those tokens into
  [`plgg-view`](../plgg-view/) `Html<never>` spans, degrading
  to an escaped `<pre><code>` block when no language matches.

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root
  `CLAUDE.md`).
- No runtime dependency beyond the plgg family; `typescript`
  is a dev-dependency for type-checking only, so highlighting
  adds nothing to a consumer's install.
- After editing a `file:`-linked dependency's source, rebuild
  its `dist` or this package won't see new exports.
