---
created_at: 2026-06-13T18:31:41+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort:
commit_hash:
category:
depends_on:
---

# Research: richer event payloads + configurable preventDefault for handlers

## Overview

**Research/design spike — deliverable is a design proposal + a throwaway spike,
not a shipped feature.** The handler channel is deliberately minimal: a handler
receives only the target control's `value` (`payloadOf` in `render.ts` returns
`value` for input/textarea/select, else `""`), and `preventDefault` fires for
**`submit` only**. That sharply bounds interaction: keyboard shortcuts can't read
a key code, the modal click-outside needs a hack (separate sibling instead of
`stopPropagation`), and HTML5 drag-and-drop can't work (no `preventDefault` on
`dragover`, no `dataTransfer`).

This ticket researches enriching the **element-level** event channel — typed
event decoders + configurable `preventDefault`/`stopPropagation` — and
recommends an API. (Window/document-level events — e.g. global Escape — are a
subscription, handled in [[20260613183140-research-effects-and-subscriptions]].)

## Key Files

- `packages/plgg-view/src/Program/usecase/render.ts` — `payloadOf` (`:34`, value-or-`""`), `setHandler` (`:98`, the single live listener that currently hard-codes `preventDefault` only for `submit` at `:114`), `handlersOf` (`:531`).
- `packages/plgg-view/src/Html/model/Attribute.ts` — `on`/`Handler` (`toMsg: (payload: SoftStr) => Msg`), `onClick`/`onInput`/`onChange`/`onSubmit`; the channel to enrich.
- `packages/example/src/app.ts` — the would-be drivers: modal click-outside (currently a separate-sibling hack to dodge missing `stopPropagation`), keyboard Escape, drag-to-reorder (today done with ▲▼ click buttons because drag can't be wired).

## Related History

- [20260530001735-replace-plgg-view-with-minimal-elm-architecture.md](.workaholic/tickets/archive/work-20260528-143038/20260530001735-replace-plgg-view-with-minimal-elm-architecture.md) — Established the `Attribute<Msg>` `Handler` box and the value-or-`""` payload contract this revisits.
- [20260609185443-plgg-view-keyed-reconcile-flip.md](.workaholic/tickets/archive/work-20260531-003055/20260609185443-plgg-view-keyed-reconcile-flip.md) — Same exhaustive-`match` discipline applies: enriching the handler channel touches every `Attribute` fold.

## Research Questions

1. **Typed event decoders.** Elm's `on : String -> Decoder msg`, where the app supplies a decoder that pulls exactly what it needs from the event (`key`, `keyCode`, pointer coords, `dataTransfer`, `checked`, `clientX/Y`). Evaluate adopting decoders vs. widening the fixed payload. Decoders fit "rich typing only where confusion occurs" and avoid leaking the raw `Event`.
2. **Custom handlers.** Elm's `Html.Events.custom : String -> Decoder {message, stopPropagation, preventDefault}`. Adopt a variant where a handler declares whether to prevent/stop — replaces the hard-coded `submit`-only rule and the modal's separate-sibling hack.
3. **Keeping the DOM out of the core.** A decoder runs over a real DOM `Event` — does it live in `Program/usecase` (DOM seam) with the pure core only naming fields it wants? How to type the decoder without exposing `Event` to `Html/model` and without `as`?
4. **Backward compatibility.** Preserve `onClick`/`onInput`/`onChange`/`onSubmit` (and the current `submit`-preventDefault default) so existing apps/tests don't change; add the richer channel alongside.
5. **Scope vs. subscriptions.** Element-level richness here; *global* listeners (window keydown for app-wide Escape) belong to `Sub` — draw the line and avoid duplicating.

## Implementation Steps (research)

1. Survey Elm `Html.Events` (`on`, `stopPropagationOn`, `preventDefaultOn`, `custom`) and a typed-decoder approach in TS that stays `as`-free (a small combinator set: `field`, `at`, `key`, `checked`, …).
2. Prototype a spike: a `custom`/decoder handler variant + configurable prevent/stop in `setHandler`.
3. Wire example use cases on the spike: Escape-closes-modal via element keydown decoder, modal click-outside via `stopPropagation` (drop the sibling hack), and a drag-to-reorder proof (dragstart/dragover `preventDefault` + a `dataTransfer`/key decoder) to compare against the ▲▼ click reorder already shipped.
4. Recommend the decoder/custom-handler API, the prevent/stop model, the core/DOM boundary, and the back-compat path; open the follow-up implementation ticket.

## Considerations

- **Preferring Rich Typing** (`standards:implementation`): a typed decoder that extracts named fields is the type-driven answer — the app states exactly what it reads from the event, no raw `Event` bag, no `as`.
- **Domain–DOM separation**: decoders execute at the `render.ts` seam; the pure core only declares field names/shapes it wants back.
- **Accessibility** (`standards:design`): proper keyboard handling (Escape, Enter/Space activation, arrow-key navigation) is WCAG 2.2 AA — this channel is the enabler; fold keyboard-operability use cases into the design.
- **Cross-ticket**: global/window events → [[20260613183140-research-effects-and-subscriptions]] (`Sub`); drag-to-reorder may also want post-paint measurement from [[20260613183139-research-ref-post-paint-hook]].
- Exhaustive `match` across every `Attribute` fold; no `as`/`any`/`ts-ignore` (CLAUDE.md); coverage >90% on follow-ups.
