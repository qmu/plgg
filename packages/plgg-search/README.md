# plgg-search

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

**The browser-shippable full-text search core of the plgg family** —
PoC 1's proven artifact ported to production (integration ticket 1 of
the plggpress PoC-portal mission). One shared tokenizer, a
heading-scoped markdown chunker, an inverted-index builder, and
from-scratch BM25 ranking. Zero dependencies beyond `plgg` and **no
node builtins** — the same code runs in the SSG build step and in the
reader's browser, pinned by `browserShippable.spec.ts`.

```
markdown ── chunkMarkdown ── buildFtsIndex ── fts.json ── searchFts (browser)
```

## The shared-tokenizer invariant

Index build and query time MUST tokenize identically or recall
silently collapses. The `CjkStrategy` (`"none"` | `"segmenter"` |
`"bigram"`) is stored **inside** the built `FtsIndex`, and
`searchFts` reads it from there — the two sides cannot mismatch by
construction. Latin runs are lowercase alphanumeric spans (noise
single characters dropped); CJK runs segment via the platform
`Intl.Segmenter("ja")` word dictionary or a bigram sliding window
(PoC 1's measured CJK answer).

## Layout

- `src/domain/model/` — `ChunkSeed`, `ChunkMeta`/`Posting`/`FtsIndex`
  (the shipped JSON shape, snippet text included), `Scored`,
  `CjkStrategy`.
- `src/domain/usecase/` — `tokenize`, `chunkMarkdown` (fence-aware,
  heading-trail chunking), `chunkTokens`/`buildFtsIndex`, `searchFts`
  (BM25, k1=1.2 b=0.75).
- `src/browserShippable.spec.ts` — the pin: no `node:` import and
  nothing server-shaped anywhere in production source; the runtime
  dependency set is exactly `plgg`.

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root `CLAUDE.md`).
- The only runtime dependency is `plgg`; there is no `vendors/`
  directory because there is nothing to vendor.
- After editing a `file:`-linked dependency's source, rebuild its
  `dist` or this package won't see new exports.
