---
created_at: 2026-06-13T18:31:39+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort:
commit_hash:
category:
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
