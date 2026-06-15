---
created_at: 2026-06-13T18:31:39+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 1h
commit_hash: c3211d4
category: Added
depends_on:
---

# Research: ref / post-paint hook for plgg-view

## Overview

**Research/design spike — deliverable is a design proposal + a throwaway spike,
not a shipped feature.** The example surfaced that an app cannot reach a DOM node
after a render commits: there is no way to say "after this patch, scroll the new
todo into view" or "focus the add-input after submit" or "focus the modal dialog
on open." The renderer already does post-commit DOM work internally (FLIP
measures survivor boxes), but that capability is not exposed to the app.

This ticket researches the smallest primitive that closes the gap — a
**ref / post-paint lifecycle hook** — and recommends an API, with a spike wiring
two real use cases in the example (auto-scroll to a new todo, focus management).
Implementation is a separate follow-up ticket.

## Key Files

- `packages/plgg-view/src/Program/usecase/render.ts` — the renderer; `createNode`/`patchElement`/`reconcile` are the commit points a hook would fire from; `Wiring` already holds a `keyed: WeakMap<Element, SoftStr>` (element↔key) and an injectable `Play` seam (precedent for a testable effect seam).
- `packages/plgg-view/src/Program/usecase/sandbox.ts` / `application.ts` — the `dispatch → update → paint` loop (`paint` at `application.ts:200`); where a post-paint pass would run.
- `packages/plgg-view/src/Html/model/Attribute.ts` — the `Attribute<Msg>` union and the `on`/`Handler` channel (precedent for a DOM-touching, SSR-dropped, Msg-less escape hatch like `key`/`transition`).
- `packages/example/src/app.ts` — the demo; `viewTodo` (auto-scroll target), the add `form`/`input` (focus-after-add), the modal (focus-on-open).

## Related History

The renderer and animation work built the seams this would extend and left DOM-access escape hatches out of scope on purpose.

- [20260609185443-plgg-view-keyed-reconcile-flip.md](.workaholic/tickets/archive/work-20260531-003055/20260609185443-plgg-view-keyed-reconcile-flip.md) — Added the `keyed` WeakMap and the post-commit FLIP measure; the renderer already locates nodes by key after commit (the machinery a ref/post-paint hook would lean on).
- [20260604004534-plgg-view-transition-directive.md](.workaholic/tickets/archive/work-20260531-003055/20260604004534-plgg-view-transition-directive.md) — Introduced the injectable `Play` seam — the model for keeping a DOM-touching capability unit-testable.
- [20260531064930-redesign-plgg-view-renderer-as-diff-patch.md](.workaholic/tickets/archive/work-20260531-003055/20260531064930-redesign-plgg-view-renderer-as-diff-patch.md) — Established `createNode`/`reconcile`/`patchElement`, the commit points a hook fires from.

## Research Questions

1. **Shape of the primitive.** Compare:
   - (a) a `ref(node => void)` `Attribute<never>` variant (React-style) firing after the node mounts/patches;
   - (b) an `onMount`/`onPatch` lifecycle attribute;
   - (c) a key-addressed post-paint command (the app names a key; the runtime resolves it via `wiring.keyed` after paint) — keeps the view free of callbacks but needs the effects channel;
   - (d) Elm's answer: no refs at all — DOM access is a `Task` (`Browser.Dom.focus`, `getViewport`) dispatched as a `Cmd`. Weigh this against the no-`Cmd`-yet runtime (overlaps [[20260613183140-research-effects-and-subscriptions]]).
2. **When does it fire** in `dispatch → update → paint`? Synchronously after `paint`, or on `requestAnimationFrame`? What ordering guarantee relative to FLIP?
3. **Purity / house style.** A ref callback is a DOM escape hatch — how to confine it like the handler channel (SSR drops it; only the client renderer runs it; the pure `view`/`update` stay DOM-free)? No `as`/`any`; narrow with `instanceof`.
4. **Testability.** Can it route through an injectable seam like `Play` so happy-dom tests can assert it fired with the right node?
5. **Exhaustiveness cost.** A new `Attribute` variant must add an arm to every fold (`renderToString`, `collectCss`, `mapHtml`, and `render.ts` `applyAttribute`/`enterOf`/`exitOf`/`staticAttrsOf`/`handlersOf`). Quantify.

## Implementation Steps (research)

1. Survey prior art: React refs/callback refs, Elm `Browser.Dom` tasks, Svelte actions (`use:`). Note which fits the Elm-Architecture purity contract best.
2. Prototype option (a) or (b) as a spike branch: a `ref`/`onMount` attribute that fires post-commit through a testable seam.
3. Wire two real example use cases on the spike: auto-scroll the list to a newly-added todo, and focus the add-input after submit (and/or focus the modal on open — an accessibility win).
4. Write up the recommended API, the rejected alternatives and why, the firing-point decision, and the testing approach. Open the follow-up implementation ticket.

## Considerations

- **Domain–DOM separation** (`standards:implementation`): the pure core (`Html/model`, `update`, `view`) must stay DOM-free; the ref is a *confined seam* in `Program/usecase/render.ts`, exactly like the handler/`Play` seams. (`packages/plgg-view/src/Program/usecase/render.ts`)
- **Preferring Rich Typing / Declarative Code**: a callback ref is the least-typed option; evaluate whether a key-addressed post-paint command (data, not a closure) better preserves "behavior predictable from signatures." 
- **Accessibility** (`standards:design`): focus management (move focus into an opened modal, back on close; focus the new item) is a WCAG 2.2 concern — this primitive is the enabler, so fold a11y use cases into the design.
- **Relationship to other research**: if [[20260613183140-research-effects-and-subscriptions]] lands a `Cmd` channel first, option (c)/(d) (DOM access as a command/task) may be strictly better than a callback ref — sequence the design discussion accordingly. Measuring for [[20260613183142-research-reversible-size-transition-lifecycle]] also needs this post-paint access.
- No `as`/`any`/`ts-ignore` (CLAUDE.md); keep coverage >90% on whatever ships from the follow-up.

## Recommendation

**Adopt a `ref` `Attribute` variant** (option a/b), not a key-addressed command
and not the Elm `Cmd`-task route — for now.

- **Shape**: `ref((node: Element) => void): Attribute<never>` — a `Box<"Ref">`
  carrying a callback, `Msg`-less like `key`/`transition`, so it drops into any
  attribute list. SSR drops it; only the client renderer runs it.
- **Firing point**: synchronously at the end of the commit for that node — in
  `createNode` after children are attached, and in `patchElement` after
  attributes/children are patched — so the node and its subtree exist when the
  callback runs, and it composes with keyed reconcile (fires on the
  reused-or-created node). Run it *after* the paint completes for the whole tree
  is the alternative; per-node-after-commit is simpler and sufficient for
  scroll/focus. Not `requestAnimationFrame` (would race the app's next dispatch).
- **Testability**: route the invocation through a seam on `Wiring` (like `play`)
  so happy-dom tests assert it fired with the right node.
- **Purity**: the callback is a confined DOM escape hatch, exactly like the
  handler channel — `view`/`update` stay DOM-free; the callback only *reads/acts
  on* a node, it does not produce a `Msg`. Document it as the imperative seam.

**Rejected / deferred**:
- *Key-addressed post-paint command* (option c) and *Elm `Browser.Dom` task as a
  `Cmd`* (option d) are cleaner long-term (data, not a closure) but both need the
  effects channel from [[20260613183140-research-effects-and-subscriptions]].
  Recommendation: ship the `ref` variant now (zero new subsystems); once `Cmd`
  exists, a `Dom.focus`/`Dom.scrollIntoView` command can layer on top and `ref`
  remains the low-level escape hatch.

**Follow-up impl ticket** should: add the `Box<"Ref">` variant + `ref` builder;
add the `key$()`-style exhaustive arm to every `Attribute` fold (`renderToString`
→ `""`, `collectCss` → `[]`, `mapHtml` → re-box, `render.ts` apply/enter/exit/
static/handlers → run-or-noop); fire via a `Wiring` seam; wire the example
auto-scroll-to-new-todo and focus-after-add (+ focus-the-modal-on-open for a11y).

## Final Report

Research spike complete — deliverable is the design recommendation above; no
runtime code changed (renderer changes await review, per the agreed sequencing).
Recommendation: smallest viable primitive (`ref` variant), with the
command/task route deferred behind the effects ticket. A follow-up
implementation ticket should be opened from the recommendation before coding.
