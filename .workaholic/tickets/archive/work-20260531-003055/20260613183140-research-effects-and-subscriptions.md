---
created_at: 2026-06-13T18:31:40+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, UX]
effort: 1h
commit_hash: c480fb2
category: Added
depends_on:
---

# Research: effects & subscriptions (Cmd / Sub) for the plgg-view runtime

## Overview

**Research/design spike — deliverable is a design proposal + a throwaway spike,
not a shipped feature.** This is the largest of the surfaced gaps. The runtime is
deliberately effect-free: `sandbox.ts` documents "**No `Cmd`, no `Sub`**" and
`application.ts:204` notes its URL reflection is "a render-time effect (NOT a
`Cmd`)". Consequently nothing can run on a timer or interval or subscribe to an
ongoing source: toasts can't auto-dismiss, there's no live clock, search can't
debounce, and the deferred "sequenced reveal" orchestration (animationend → Msg)
has nowhere to live.

This ticket researches adding an **effects phase** — one-shot commands (`Cmd`)
and ongoing **subscriptions** (`Sub`) — to the Elm-Architecture runtime, keeping
`update`/`view` pure and `sandbox` effect-free, and recommends the minimal shape.

## Key Files

- `packages/plgg-view/src/Program/usecase/sandbox.ts` — `Sandbox<Model,Msg>` (`update: (msg, model) => Model`); the pure baseline that must stay pure.
- `packages/plgg-view/src/Program/usecase/application.ts` — `Application` + the `dispatch → update → paint` loop (`:188`); the URL reflection (`:200-238`) is the existing "render-time effect, interpreted by the runtime" precedent a `Cmd` interpreter would generalize.
- `packages/plgg-view/src/Program/usecase/render.ts` — the injectable `Play` seam is the model for an injectable effect interpreter (testability); `stop()` cleanup is the precedent for subscription teardown.
- `packages/plgg-fetch/src` — a `fetch` `Cmd` would interpret through this (vendor-neutral HTTP), tying the effect system to existing infrastructure.
- `packages/example/src/app.ts` — `Toast`/`ToastDismissed` (auto-dismiss timer), search `q` (debounce), and a would-be live clock are the concrete drivers.

## Related History

- [20260604004534-plgg-view-transition-directive.md](.workaholic/tickets/archive/work-20260531-003055/20260604004534-plgg-view-transition-directive.md) — Explicitly deferred Model-driven transition *orchestration* (`animationend → Msg`, `delay`/`stagger`) as "a separate, larger ticket" — that orchestration is a subscription/effect, i.e. this work.
- [20260609185443-plgg-view-keyed-reconcile-flip.md](.workaholic/tickets/archive/work-20260531-003055/20260609185443-plgg-view-keyed-reconcile-flip.md) — Reiterated that fire-and-forget motion stays in the renderer and that sequenced orchestration needs an `animationend → Msg` channel — a `Sub`.
- The `Todo.ts` doc comment already anticipates "a future plgg-view `Cmd`/effects phase" for an HTTP-backed variant.

## Research Questions

1. **Adopt Elm's model or a leaner one?** Elm: `update : Msg -> Model -> (Model, Cmd Msg)` plus `subscriptions : Model -> Sub Msg`, both interpreted by the runtime. Evaluate adopting this vs. a minimal subset.
2. **Backward compatibility.** Keep `sandbox` pure (no Cmd) and introduce an `element`-style program (cf. Elm `Browser.element`) whose `update` returns `[Model, Cmd<Msg>]`? Or make the Cmd optional on the existing types? Preserve the 25 example tests and the pure-`update` ergonomics.
3. **Minimal `Cmd` set.** Which one-shot effects are worth shipping first: `after(ms) → Msg` (timer), `none`, batch, `random`, `fetch` (via plgg-fetch), DOM tasks (focus/scroll — overlaps [[20260613183139-research-ref-post-paint-hook]])?
4. **Minimal `Sub` set.** `every(ms) → Msg` (interval/clock), `onWindow(event, decoder) → Msg` (global keydown for modal Escape — overlaps [[20260613183141-research-event-payload-and-preventdefault-model]]), `onAnimationEnd` (orchestration). How are subs diffed across renders and torn down (the `stop()`/cleanup precedent)?
5. **Purity & testability.** `Cmd`/`Sub` as *data* interpreted by an injectable runtime seam (like `Play`) so `update` stays a pure function and tests assert the emitted commands without performing them.
6. **Cancellation & races.** Debounce/timers need cancellation (a later keystroke cancels the earlier timer) — model it (keyed cmds? a cancel token?).

## Implementation Steps (research)

1. Write up Elm's `Cmd`/`Sub`/`Browser.element` model and the minimal subset that fits plgg's "minimize complexity" + "Option/Result, no escape hatch" constraints.
2. Prototype a spike `element` program: `update` returning `[Model, Cmd]`, a `subscriptions` function, and a tiny interpreter behind an injectable seam (`after`, `every`, `onWindow`).
3. Wire example use cases on the spike: toast auto-dismiss (`after`), a header live clock (`every`), debounced search (`after` + cancel), and modal Escape (`onWindow` keydown).
4. Recommend the API surface, the backward-compat path (sandbox stays pure), cancellation model, and teardown; split the implementation into staged follow-up tickets (Cmd first, Sub second).

## Considerations

- **Preferring Declarative Code** (`standards:implementation`): the whole point — effects as *data* returned from a pure `update`, interpreted at the edge, so behavior stays predictable from signatures and unit-testable without a DOM/clock. Mirror the existing "URL reflection interpreted by the runtime" and `Play` seam patterns.
- **Conservative Vendor Dependence**: a `fetch` `Cmd` must interpret through plgg-fetch (no new vendor coupling); timers/intervals through injectable seams so a test clock can stand in.
- **Domain Layer Separation**: `Cmd`/`Sub` values live in the pure core; only the runtime interpreter touches timers/DOM/network.
- **Scope discipline / minimize complexity**: this can sprawl — recommend the *smallest* set that unblocks the example (timer + interval + global event), and stage the rest. Do not import Elm wholesale without justifying each piece.
- **Cross-ticket**: subsumes the *global* keyboard case (window keydown `Sub`); element-level event richness is [[20260613183141-research-event-payload-and-preventdefault-model]]. DOM-task commands overlap [[20260613183139-research-ref-post-paint-hook]]; animationend orchestration unblocks [[20260613183142-research-reversible-size-transition-lifecycle]].
- No `as`/`any`/`ts-ignore` (CLAUDE.md); coverage >90% on shipped follow-ups.

## Recommendation

**Adopt Elm's `Browser.element` model, staged** — keep `sandbox` pure; add a new
`element`-style program where `update` returns `[Model, Cmd<Msg>]` and a
`subscriptions: (model) => Sub<Msg>` function exists. `Cmd`/`Sub` are **data**
interpreted by an injectable runtime seam (mirrors the existing "URL reflection
interpreted by the runtime" and the `play` seam), so `update` stays a pure,
unit-testable function.

- **Don't touch `sandbox`/`Application`'s pure `update`** (`(msg, model) => Model`).
  Introduce `element` alongside, and an adapter so an `Application` can opt in.
  This preserves the 25 example tests and the pure-reducer ergonomics.
- **Stage 1 — `Cmd`** (ship first): `none`, `batch([...])`, `after(ms) → Msg`
  (the toast auto-dismiss driver), and `perform`/`fetch` via plgg-fetch (no new
  vendor coupling). Cancellation via *keyed* commands (`after(key, ms)`) so a
  later keystroke cancels an earlier debounce timer — model cancellation
  explicitly from the start; it's the part that's painful to retrofit.
- **Stage 2 — `Sub`**: `every(ms) → Msg` (live clock), `onWindow(event, decoder)
  → Msg` (global Escape — pairs with the decoder from
  [[20260613183141-research-event-payload-and-preventdefault-model]]), and
  `onAnimationEnd` (unblocks the staggered-reveal orchestration deferred by the
  transition tickets and [[20260613183142-research-reversible-size-transition-lifecycle]]).
  Subs are diffed across renders by key and torn down via the existing `stop()`
  cleanup precedent.
- **Interpreter seam**: an injectable `Effects` record (timers/interval/
  window-events/fetch) defaulting to the real implementations, swapped for a test
  clock/stub — so `update` returning a `Cmd` is asserted without performing it.

**Rejected**: importing Elm wholesale (ports, `Task` chains, `Process`) — over
the "minimize complexity" budget; add only the three drivers the example needs.

**Follow-up**: split into two impl tickets (Cmd first, Sub second). DOM-task
commands (focus/scroll) should reuse [[20260613183139-research-ref-post-paint-hook]]
rather than duplicate DOM access.

## Final Report

Research spike complete — recommendation above; no runtime code changed.
Recommendation: staged Elm `Browser.element` (`Cmd` then `Sub`), effects-as-data
behind an injectable interpreter, `sandbox` stays pure, cancellation modeled from
day one. Two follow-up implementation tickets to be opened before coding.
