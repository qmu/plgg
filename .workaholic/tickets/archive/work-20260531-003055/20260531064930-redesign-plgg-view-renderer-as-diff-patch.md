---
created_at: 2026-05-31T06:49:30+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 4h
commit_hash: eca3ef4
category: Changed
depends_on:
---

# Redesign the `plgg-view` client renderer as a diff/patch reconciler (focus-safe, O(changes))

## Overview

`packages/plgg-view` is the minimal Elm Architecture (TEA) runtime built on
[plgg](../../../../packages/plgg/). Its client runtime re-rendered by **replacing
the whole DOM tree** on every `Msg`:
`container.replaceChildren(buildDOM(view(model)))`. Make it **more production-ready
— "small like Preact"** — by swapping that engine for an in-place **virtual-DOM
diff/patch reconciler**, **without growing the feature surface**: the public API
(`sandbox`/`application`/builders/SSR), the pure `Html<Msg>` model, `foldHtml`,
`mapHtml`, and the SSR-safe core entry all stay identical. Only the client
renderer changes.

**Why it matters (the bug this fixes):** full re-render rebuilt the entire tree
for a one-character change, and — because it discarded and recreated every node —
a text `<input>` with `onInput` lost **focus, caret, and IME composition on every
keystroke**. The bundled To-Do example was effectively unusable for typing. This
is a reliability defect, not just a perf one.

**Confirmed scope decision (from the scoping question):** *diff/patch core only.*
Keyed-list reconciliation (correct reuse on list **reorders**) and microtask
**render batching** are explicitly deferred as follow-ups — not built here.

**The plgg way (non-negotiable):** no `as`/`any`/`ts-ignore`; pure data +
data-last functions through `pipe`/`match`/`Option`; DOM mutation confined to the
client renderer (the one justified imperative seam, commented); strict coverage
> 90%. **No new runtime dependency** — Preact is a *design comparison only*; the
sole runtime dependency stays `plgg`.

## Key Files

- `packages/plgg-view/src/Program/usecase/render.ts` — **the rewrite**: replaces
  the `replaceChildren` renderer with `makeRenderer` + `reconcile`/`createNode`/
  `patchAttributes`/`patchChildren`, a per-node event registry, and `value`/
  `checked` property syncing.
- `packages/plgg-view/src/Program/usecase/sandbox.ts`,
  `packages/plgg-view/src/Program/usecase/application.ts` — build one
  `makeRenderer(container, dispatch)` per mount instead of calling a stateless
  `render`.
- `packages/plgg-view/src/client.ts` — barrel: export `makeRenderer` (+ `Wiring`)
  in place of `render`.
- `packages/plgg-view/src/Program/usecase/render.spec.ts` — rewritten spec suite
  for the diff engine.
- `packages/plgg-view/README.md`, `packages/plgg-view/example.ts`,
  `packages/example/src/server.ts` — narrative updated from "full re-render" to
  diff/patch.
- Reference precedent for the model/fold being preserved:
  `packages/plgg-view/src/Html/usecase/foldHtml.ts`,
  `.../renderToString.ts`, `.../escape.ts` (untouched, SSR-safe).

## Implementation Steps

1. Add `makeRenderer<Msg>(container, dispatch)` returning `(next: Html<Msg>) =>
   void`, holding the previously rendered tree as an `Option<Html<Msg>>` (the
   renderer's one mutable seam) — full build on first paint, diff thereafter.
2. `reconcile(parent, domNode, oldVnode, newVnode)`: reuse the node when kind +
   tag match (the focus/caret/scroll-preserving path), else swap it; `instanceof`
   guards make the swap the safe fallback when the live DOM has drifted.
3. Text leaves update `.data` (via `CharacterData`); elements patch attributes
   (add/change/remove) then children (index-based).
4. Wire **one real listener per (node, event)**, stored in a `WeakMap` registry,
   re-pointed on patch — never duplicated, never stale (the live handler is read
   on each fire).
5. Drive `value`/`checked` as DOM **properties** on input/textarea so controlled
   fields stay correct under reuse (e.g. the add-form input clears after submit);
   `<select>` stays attribute-only (its value depends on `<option>` ordering).
6. Repoint `sandbox`/`application`/`client.ts` to `makeRenderer`; update README,
   `example.ts`, and `packages/example/src/server.ts` narrative.
7. Close the loop: `scripts/tsc-plgg-view.sh` + `scripts/test-plgg-view.sh` green
   at > 90% coverage; verify `example`, `plgg-server`, and `scripts/check-all.sh`
   still pass.

## Considerations

- **Reliability over performance is the headline.** The focus/IME loss made
  controlled inputs unusable — node reuse is what fixes it. (Maps to the
  implementation policy: the running system keeps *serving correctly*, and the
  renderer *recovers* by replacing rather than throwing when the DOM has drifted
  from the old vnode.)
- **No escape hatches.** happy-dom does not honour `instanceof Text` (it does for
  `Element`/`HTMLInputElement`); the text guard uses `instanceof CharacterData`
  (`Text extends CharacterData`, exposes the writable `.data`) — correct in both
  happy-dom and browsers, and **no cast**.
- **Confined imperative seam.** All DOM mutation and the previous-tree/handler-map
  refs live only in the client renderer, commented — the pure core stays pure.
- **Out of scope (follow-ups, do not build here):** keyed-list reconciliation for
  reorder-correct reuse; microtask render batching; SSR hydration (mount still
  rebuilds from `init`); `Cmd`/`Sub` effects.

## Final Report

Completed and verified this session. `render.ts` was rewritten to a stateful
`makeRenderer` + `reconcile` diff/patch engine; `sandbox`/`application` build one
renderer per mount; `client.ts` now exports `makeRenderer`/`Wiring`. The pure
`Html<Msg>` model, `foldHtml`, `mapHtml`, and SSR `renderToString` are untouched,
and **no runtime dependency was added** (only `plgg`). Docs/narrative updated.

- **plgg-view:** 49 tests pass; coverage statements 98.9 / **branches 94.7** /
  functions 98.5 / lines 98.8 (> 91 thresholds). A spec asserts
  `document.activeElement` survives a re-render on the reused input node.
- **Downstream:** `example` 8/8, `plgg-server` 73/73, and `scripts/check-all.sh`
  green across the whole monorepo; `tsc` clean; dist rebuilt.

### Discovered Insights

- **Insight**: In happy-dom (the test env), `document.createTextNode(...)
  instanceof Text` is **false**, while `instanceof Element` / `HTMLInputElement`
  are true and `instanceof CharacterData` is true. A diff renderer that
  discriminates text nodes with `instanceof Text` silently takes the *replace*
  path on every text update under tests.
  **Context**: Use `instanceof CharacterData` (and its writable `.data`) to
  narrow/patch text nodes — works in happy-dom and real browsers, and keeps the
  no-cast rule.
- **Insight**: Under node reuse, a control's `value`/`checked` **attribute** and
  its live **property** diverge once the user (or a model reset) touches the
  field, so setting only the attribute leaves a controlled input stale (the add
  form would never clear). The property must be driven directly (narrowed via
  `instanceof`, no cast).
  **Context**: `<select>` is deliberately excluded — a parent's attribute pass
  runs before the `<option>` children exist, so property-syncing its value there
  is wrong; selects stay attribute-only, same as before.
- **Insight**: Re-pointing handlers by `removeEventListener`/`addEventListener`
  on each patch is both leak-prone and churny. One listener per (node, event)
  that reads the *current* handler from a `WeakMap` registry on each fire avoids
  duplicate listeners and stale closures with zero per-render listener work.
  **Context**: The `WeakMap` keeps the bookkeeping off the DOM node (no expando,
  no cast) and lets it be collected with the node.
