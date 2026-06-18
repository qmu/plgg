---
created_at: 2026-06-18T17:52:27+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 1h
commit_hash: 16c8d4d
category: Changed
depends_on:
---

# Make the API reference a compact signature index

## Overview

The API reference is still a long, low-value wall: `typedoc-plugin-markdown`
renders **every** symbol with full `#### Type Parameters`, `#### Parameters`, and
`#### Returns` sub-sections (tables), even for one-line functions like
`mapOption(f): (fa) => Option<B>`. For a functional library the **signature
already says everything**, so these sub-sections are pure ceremony — ~143 symbols
× 3–4 sub-sections = a page nobody wants to read. The plugin has **no option to
suppress** those sections (verified: its options only switch table-vs-list
*formatting* — `parametersFormat`, `indexFormat`, etc. — there is no hide/omit).

Desired shape (chosen by the user): a **compact signature index** — one dense
entry per public symbol = its **signature + a one-line summary**, grouped by
category, with **no** Type-Parameter/Parameters/Returns sub-tables. Comprehensive
(every public symbol still listed) but ~5× shorter and scannable:

```
## Disjunctives

`mapOption(f)` → `(fa) => Option<B>`
  map a function over a Some
`chainOption(f)` → `(fa) => Option<B>`
  flat-map over a Some
`getOr(fallback)` → `(opt) => T`
  unwrap, or the fallback for None
```

Still **auto-generated and in-sync** (regenerated on build); the existing
`@internal`/`exclude` curation (instances, match helpers, overloads,
Grammaticals/Abstracts) stays in force so only the public surface appears.

## Key Files

- `packages/guide/scripts/gen-api.mjs` — the generator. Today it runs TypeDoc
  (markdown plugin) per package into `api/<pkg>/index.md` and writes the flat
  per-package sidebar. This is where the compaction happens.
- `packages/guide/typedoc.base.json` — current TypeDoc options (markdown +
  vitepress-theme plugins, `excludeInternal`, `exclude` globs, `disableSources`,
  table formats, `outputFileStrategy: modules`).
- `packages/guide/.vitepress/config.ts` — loads `api/typedoc-sidebar.json` (one
  flat link per package); unchanged in shape.
- `packages/guide/package.json` — devDeps; `typedoc-plugin-markdown` /
  `typedoc-vitepress-theme` may become unnecessary depending on the approach
  chosen below.
- `packages/guide/api/index.md` — the reference landing (hand-written, lists the
  per-package pages); keep.

## Implementation Steps

Two viable approaches — **prefer the post-process** (simpler, reuses the working
pipeline, and the generated signature code block already matches the desired
one-liner shape, e.g. `function mapOption<A, B>(f): (fa) => Option<B>`):

**A. Post-process the generated markdown (recommended).**
1. Keep generating the per-package `index.md` with the markdown plugin as now.
2. In `gen-api.mjs`, add a transform over each generated `index.md` that, for
   every symbol, keeps the heading, the signature code block, and the one-line
   description, and **deletes the `#### Type Parameters` / `#### Parameters` /
   `#### Returns` sub-sections** (drop from any `#### ` heading until the next
   `### ` / `## ` / `***`). Leave the top-of-page index table (`indexFormat:
   table`) as the quick category index.
3. Verify the page shrinks dramatically and each symbol is signature + summary.

**B. Generate from TypeDoc JSON (fallback, if the post-process proves brittle).**
1. Run `typedoc --json` per package (drop the markdown/vitepress-theme plugins).
2. Write a small emitter that renders, per symbol, `name(params) → ReturnType` +
   first line of the doc comment, grouped by the symbol's source category
   (Atomics/Basics/Disjunctives/… derivable from the defining file path). Needs a
   type-to-string helper for the JSON type model.

Then, for either approach:
4. Group entries by category (the README's categories — Atomics, Basics,
   Disjunctives, Contextuals, Conjunctives, Collectives, Exceptionals, Flowables,
   Functionals) so the page reads as sections, matching the preview.
5. `npm run build` in `packages/guide`; confirm no dead links, the page is short,
   and the public vocabulary is all present. If approach A removed the need for
   the markdown plugins, prune the devDeps; otherwise leave them.

## Considerations

- **Stay comprehensive + auto-generated.** Every public (non-`@internal`) symbol
  must still appear, regenerated from source on build — no hand-maintained lists,
  no drift. This ticket changes *rendering density*, not coverage.
- **Curation already done upstream.** The `@internal` tags (instances, match
  type-helpers, overload ladders) and `exclude` globs (Grammaticals/Abstracts)
  from the prior reference tickets remain the source of truth for what is public;
  do not re-litigate coverage here.
  ([20260618154727-hide-instance-objects-from-api-reference.md](.workaholic/tickets/archive/work-20260617-214017/20260618154727-hide-instance-objects-from-api-reference.md),
  [20260618171635-collapse-variadic-overload-noise-in-reference.md](.workaholic/tickets/archive/work-20260617-214017/20260618171635-collapse-variadic-overload-noise-in-reference.md))
- **Signatures may abbreviate params** (e.g. `mapOption(f)` without `f`'s full
  type) — that matches the chosen preview and is acceptable; the full type is one
  hover/词 away in an editor, and the reference optimizes for scanning.
- **Operation policy (`standards:operation`).** Keep generation reproducible and
  runnable in the deploy workflow after the dependency-ordered dist build.
- A possible follow-up (separate): curate the long mechanical tail
  (`asI8`…`asU128`, the functor/monad derived fns, JSON-ready codecs) if even the
  compact list reads as too long — the user chose the comprehensive compact index
  for now, not curation.

## Final Report

Implemented **approach A** (post-process). `packages/guide/scripts/gen-api.mjs`
now transforms each TypeDoc-generated `index.md` into a compact signature index:
for every public symbol it keeps the heading, the signature code block, and the
one-line summary, and **deletes the `#### Type Parameters` / `Parameters` /
`Returns` / `Type Declaration` / `Properties` / `Index Signature` sub-tables**
(plus the `***` separators and the old kind-group `##` headings). The strip is
**fence-aware** so `#`/`***` inside a ```ts``` block is never mistaken for
structure. Entries are then **regrouped under `## <Category>` headings** in the
README's order (Atomics, Basics, Disjunctives, Contextuals, Conjunctives,
Collectives, Exceptionals, Flowables, Functionals; everything else, then "Other"
last). A **lossless guard** throws if the transform would drop any symbol.

Category for each symbol is derived from its `src/<Category>/` declaration site
by a static source scan (handles `export const/function/type/…`, destructured
`export const { chain: chainOption } = …`, and local `export { … }` blocks),
with cross-package `export * from "<pkg>"` re-exports (e.g. plgg-server pulling
in plgg-http/plgg-view) resolved against the target package's own symbol set so
they categorise under the aggregator's taxonomy rather than falling to "Other".

Result: every public symbol still listed, **`Other = 0` across all 9 packages**,
and the plgg page drops **8204 → 3140 lines** (~2.6×). The markdown plugin is
kept (its signatures are reused), so no devDep pruning. `npm run build` passes
with no dead links.

### Discovered Insights

- **TypeDoc escapes heading text.** Screaming-snake constants render as
  `### ICON\_CONTENT` (escaped underscore), so matching the heading name against
  the source-derived map needs the backslash-escapes stripped first — otherwise
  they silently fall into "Other".
- **Derived combinators are destructured exports.** `mapOption`/`chainOption`/
  `foldlResult`/`isBool`… are emitted as `export const { map: mapOption } = …`,
  not `export const mapOption`, so the category scan must parse the destructuring
  pattern (and take the renamed target) to categorise the bulk of the surface.
- **Aggregator packages re-export across packages with `export *`.** plgg-server
  surfaces plgg-http/plgg-view via `export * from "plgg-http"` (no names in the
  source), so categorising those 40+ symbols needs the target package's own
  symbol set, keyed to the re-exporting file's directory — not a same-file scan.
- **The generated signature block is already the desired one-liner**, which is
  why approach A beats re-emitting from JSON: no type-to-string helper needed.
  Verbose return types (e.g. the full `InvalidError` expansion) remain inside the
  signature block — acceptable per the ticket; this change is about removing the
  ceremony sub-tables, not reformatting types.
