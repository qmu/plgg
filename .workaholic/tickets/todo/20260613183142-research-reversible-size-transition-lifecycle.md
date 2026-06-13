---
created_at: 2026-06-13T18:31:42+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort:
commit_hash:
category:
depends_on:
---

# Research: reversible size-transition lifecycle (height auto-grow/shrink)

## Overview

**Research/design spike — deliverable is a design proposal + a throwaway spike,
not a shipped feature.** The accordion exposed that the motion model can shrink
but not grow: `Motion`/`Frame` are opacity+transform only, and the keyed exit
*collapses* height (`offsetHeight → 0`) on removal, but there is no inverse
*grow* (`0 → auto`) on a node that stays mounted and toggles open via Model
state. The example currently works around it with a raw CSS
`grid-template-rows: 0fr ⇄ 1fr` trick on a `attr("style", …)` escape hatch —
smooth, but outside plgg-view's motion system.

This ticket researches a **reversible size lifecycle** — a first-class, smooth
open/close (and "show more"/drawer) that the renderer owns — and recommends
whether to extend `Motion`, generalize the collapse, or add a disclosure
primitive.

## Key Files

- `packages/plgg-view/src/Html/model/Attribute.ts` — `Frame` (opacity+transform only, `:18`), `Motion` (`:28`), `transition`/`fadeIn`/`fadeOut`/`slideIn`; the model that can't express height.
- `packages/plgg-view/src/Program/usecase/render.ts` — the keyed exit height-collapse (`offsetHeight`, `overflow:hidden`, animate `height → 0` via the `Play` seam); the existing half of the lifecycle to generalize.
- `packages/example/src/app.ts` — `viewTodo`'s accordion body, currently the CSS `grid-template-rows` workaround the proper primitive would replace.

## Related History

- [20260609185443-plgg-view-keyed-reconcile-flip.md](.workaholic/tickets/archive/work-20260531-003055/20260609185443-plgg-view-keyed-reconcile-flip.md) — Built the in-flow exit *collapse* (height→0 on removal) — exactly half of a reversible size lifecycle; this generalizes it to grow.
- [20260604004534-plgg-view-transition-directive.md](.workaholic/tickets/archive/work-20260531-003055/20260604004534-plgg-view-transition-directive.md) — Established `Motion`/`Frame`/the `Play` seam and the opacity+transform-only scope this revisits.

## Research Questions

1. **Where does size belong?** Options: (a) extend `Frame`/`Motion` with a size channel — but `height: auto` is not animatable, so it needs a *measure* pass (overlaps [[20260613183139-research-ref-post-paint-hook]]); (b) a dedicated mounted-node "disclosure" lifecycle driven by an `open: boolean` directive that the renderer animates (measure-and-animate, or the `grid-rows` technique promoted into the renderer); (c) keep it a documented CSS recipe and *not* a library primitive.
2. **Reduced motion / WCAG.** Must honour `prefers-reduced-motion` (instant open/close) like the existing `Play`/collapse path.
3. **Composition with keyed reconcile.** The exit collapse already lives in the keyed path; can grow reuse the same machinery so open/close/enter/exit are one coherent lifecycle rather than two mechanisms?
4. **Measure cost & jank.** `grid-template-rows 0fr⇄1fr` needs no measurement and no JS per frame (the renderer just patches a class) — is the pure-CSS route actually *better* than a measure-and-animate primitive? Decide whether the library should bless the CSS recipe (a utility/`disclosure` helper) rather than add a JS size animator.
5. **API ergonomics.** What does the author write — `disclosure(isOpen)`? a `collapsible` attribute? — and how does it stay declarative and SSR-safe?

## Implementation Steps (research)

1. Catalogue the smooth-height techniques (CSS `grid-template-rows`, `max-height` hack, JS measure-and-animate, WAAPI on `height`) with their tradeoffs (jank, measurement, reduced-motion, SSR).
2. Prototype the two leading options as spikes: (a) a `disclosure`/`collapsible` primitive that emits the `grid-rows` recipe through the style system (no measurement), and (b) a measure-and-animate size channel reusing the collapse + a post-paint measure.
3. Replace the example accordion's raw-CSS workaround with whichever spike reads cleanest; compare smoothness and code.
4. Recommend: extend `Motion`, add a `disclosure` primitive, or bless a CSS utility — with the reduced-motion story and the keyed-lifecycle integration. Open the follow-up implementation ticket.

## Considerations

- **Emergent Design System** (`standards:design`): a disclosure/collapse is a recurring screen↔user interaction — if it becomes a primitive, it should add exactly one rule to the system, not a bespoke animator per use.
- **Accessibility** (`standards:design`): pair the visual disclosure with the right semantics (`aria-expanded`, focus order); reduced-motion must degrade to instant.
- **Preferring Declarative Code / minimize complexity**: if the CSS `grid-rows` recipe is genuinely as good, the *least* the library can do (a small utility) may beat a JS size animator — weigh "more capability" against "more renderer complexity."
- **Cross-ticket**: a measure-based approach depends on [[20260613183139-research-ref-post-paint-hook]] (post-paint measurement); sequenced/staggered disclosures depend on [[20260613183140-research-effects-and-subscriptions]] (orchestration).
- No `as`/`any`/`ts-ignore` (CLAUDE.md); coverage >90% on follow-ups.
