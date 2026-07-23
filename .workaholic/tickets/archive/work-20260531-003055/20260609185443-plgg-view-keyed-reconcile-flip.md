---
created_at: 2026-06-09T18:54:43+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 4h
commit_hash: c5cb39f
category: Added
depends_on:
---

# plgg-view: keyed child reconciliation + FLIP movement

## Overview

Make the plgg-view client renderer micro-interaction-friendly by giving list
children a stable identity. Today `patchChildren` is purely index-based: when a
non-trailing list item is deleted or filtered out, the diff rewrites each slot's
content in place and treats only the *last* DOM node as surplus — so the wrong
(trailing) row plays the exit fade while every other row snaps to new content,
and survivors teleport up to close the gap. This is the "fading feels off /
page blinks" symptom, and it is the failure mode that motivated the library in
the first place (sequenced column reveals glitching under React Motion).

This ticket adds:

1. A `key()` attribute carrying stable per-node identity (a `Msg`-less
   `Box<"Key">` variant, like `class_`/`transition`), which SSR drops and only
   the client renderer interprets.
2. A **keyed child reconcile** path: when every child of a parent is keyed,
   match old↔new children by key (not index) so reuse/move/insert/delete act on
   the *right* nodes — the genuinely new fade in, the genuinely gone fade out and
   detach, and survivors are reused in place.
3. **FLIP movement** for survivors: snapshot each survivor's box before the
   mutation, take exiting nodes out of flow so the gap closes immediately, then
   animate each survivor's inverse `translate` to identity through the existing
   `Play`/WAAPI seam — so deleting a middle item fades *that* item while the rest
   glide up instead of snapping.
4. Wire the example to-do app's `<li>` rows with `key(todo.id)` to prove the
   smooth delete/filter/search behaviour.

Keying is opt-in per list (the all-children-keyed gate), so static-shape lists
(toolbars, forms) keep the cheaper index path unchanged.

## Key Files

- `packages/plgg-view/src/Program/usecase/render.ts` — the client renderer.
  Primary file: rename the old `patchChildren` to `indexPatchChildren`
  (positional fallback), add `keyedPatchChildren`, `patchKeyed`, `keyOf`,
  `keyOfVnode`, FLIP helpers (`flipMotion`, `takeOutOfFlow`, `FLIP_DURATION_MS`),
  keyed exit (`playKeyedExit`), a `patchChildren` keyed/index dispatcher, and two
  `Wiring` fields (`keyed: WeakMap<Element, SoftStr>`, `exiting: WeakSet<Element>`).
  Must preserve the WeakMap event registry, `value`/`checked` property syncing,
  the `CharacterData` text-node guard, and the injectable `Play` seam.
- `packages/plgg-view/src/Html/model/Attribute.ts` — add the `Key` variant to the
  `Attribute<Msg>` union, the `key$()` matcher, and the
  `key(value: SoftStr): Attribute<never>` builder.
- `packages/plgg-view/src/Html/usecase/renderToString.ts` — add a `key$()` arm
  that emits `""` (key dropped server-side).
- `packages/plgg-view/src/Html/usecase/collectCss.ts` — add a `key$()` arm
  returning `[]` (a key contributes no CSS).
- `packages/plgg-view/src/Html/usecase/mapHtml.ts` — add a `key$()` arm that
  re-boxes the key unchanged (carries no `Msg`).
- `packages/example/src/app.ts` — add `key(`${todo.id}`)` as the first attribute
  of each todo `li` and import `key` from `"plgg-view"`.
- `packages/plgg-view/src/Program/usecase/render.spec.ts` — add a "keyed
  reconcile + FLIP" test section.

## Related History

These shipped tickets built the renderer and the enter/exit animation model and
explicitly deferred keyed reconcile + FLIP as a named follow-up — this ticket is
that follow-up; it is not a duplicate.

- [20260604004534-plgg-view-transition-directive.md](.workaholic/tickets/archive/work-20260531-003055/20260604004534-plgg-view-transition-directive.md) — Shipped the `Anim` directive (`fadeIn`/`fadeOut`/`transition`), `Motion`/`Frame`, and the WAAPI `Play` seam this builds on. Its Considerations defer "a key on ElementContent for keyed reconcile and animate:flip-style reorder" and the "outroing-set + absolute-positioning of exiting nodes" — exactly this work.
- [20260531064930-redesign-plgg-view-renderer-as-diff-patch.md](.workaholic/tickets/archive/work-20260531-003055/20260531064930-redesign-plgg-view-renderer-as-diff-patch.md) — Built `makeRenderer`/`reconcile`/`createNode`/`patchChildren` (the index-based diff this replaces); lists "keyed-list reconciliation for reorder-correct reuse" as out of scope.
- [20260604154845-example-animate-todo-items.md](.workaholic/tickets/archive/work-20260531-003055/20260604154845-example-animate-todo-items.md) — Wired the example `<li>` with `fadeIn`/`fadeOut`; restates the index-collision limitation. These are the rows to key.
- [20260602013118-plgg-view-typed-content-model.md](.workaholic/tickets/archive/work-20260531-003055/20260602013118-plgg-view-typed-content-model.md) — Added `Html<Msg, T>` tag-branding and `ElementContent`; children stay a uniform `ReadonlyArray<Html<Msg>>`, the constraint keyed reconcile must respect.
- [20260530001735-replace-plgg-view-with-minimal-elm-architecture.md](.workaholic/tickets/archive/work-20260528-143038/20260530001735-replace-plgg-view-with-minimal-elm-architecture.md) — Origin of the TEA architecture and the `Attribute<Msg>` Box union the `Key` variant joins; SSR drops handlers (precedent for dropping a key server-side).

## Implementation Steps

1. **`Attribute` model** — add `Box<"Key", Readonly<{ value: SoftStr }>>` to the
   `Attribute<Msg>` union, the `key$ = () => pattern("Key")()` matcher, and the
   `key(value: SoftStr): Attribute<never>` builder. Document it as identity
   metadata that SSR drops and the client renderer reads.
2. **Keep every `Attribute` fold exhaustive** — add an explicit `key$()` arm
   (never a default case) to `renderToString` (→ `""`), `collectCss` (→ `[]`),
   `mapHtml` (→ re-box unchanged), and in `render.ts` to `applyAttribute` (no-op),
   `enterOf`, `exitOf`, `staticAttrsOf`, `handlersOf`.
3. **`Wiring` registry** — add `keyed: WeakMap<Element, SoftStr>` and
   `exiting: WeakSet<Element>`; initialise both in `makeRenderer`. Record a
   node's key in `createNode` (off the node — no expando, no cast).
4. **`keyOf`/`keyOfVnode`** — Option-returning helpers that extract a key from an
   attribute list / a vnode.
5. **Keyed reconcile** — rename the existing `patchChildren` body to
   `indexPatchChildren`; add `keyedPatchChildren` that: builds `oldByKey`,
   `domByKey` (skipping nodes in `exiting`), and `newKeys`; snapshots survivor
   boxes (FLIP step 1); plays keyed exits; reuses (`patchKeyed`) or creates each
   new child; reorders nodes to the new order; then FLIPs moved survivors
   (step 2). Add a `patchChildren` dispatcher that routes to the keyed path only
   when `newChildren` is non-empty and every child is keyed, else the index path.
6. **`patchKeyed`** — reuse a node in place when kind/tag match (returns the same
   node via `patchElement`), else `replaceChild` a fresh node; return the node so
   the reorder step can position it.
7. **Exit + FLIP helpers** — `playKeyedExit` (no motion → `remove()` at once;
   with motion → add to `exiting`, `takeOutOfFlow`, play, then remove);
   `takeOutOfFlow` (narrow with `instanceof HTMLElement`, pin the offset box,
   `position: absolute`); `flipMotion(dx, dy)` (transform-only tween, inverse
   offset → identity); `FLIP_DURATION_MS`. All motion routes through `wiring.play`.
8. **Example** — add `key(`${todo.id}`)` to `viewTodo`'s `li`, import `key`.
9. **Tests** — add a "keyed reconcile + FLIP" section covering: reuse+reorder by
   key (same node objects, new order); enter fires only for genuinely-new
   children; middle-delete fades the right node then detaches; no-exit-motion
   detaches immediately; a re-added key skips the mid-exit node (fresh node);
   survivors emit a transform-only FLIP motion (stub `getBoundingClientRect` /
   `Play` so deltas are real in happy-dom).
10. **Verify** — `tsc` clean for plgg-view and example (rebuild plgg-view's
    `dist/` so the example's `import { key }` resolves against published types);
    full test suite green; coverage strictly > 90% on every metric.

## Considerations

- **No escape hatches** — `as`/`any`/`ts-ignore` are prohibited
  (`CLAUDE.md`). Narrow DOM with `instanceof` (`takeOutOfFlow` →
  `HTMLElement`), hold identity in a `WeakMap` not an expando, model absence
  with `Option` (`packages/plgg-view/src/Program/usecase/render.ts`).
- **Exhaustive `match`** — the `Attribute` union now has five variants; every
  fold must list `key$()` explicitly, no default arm
  (`packages/plgg-view/src/Html/model/Attribute.ts`).
- **Single animation seam** — enter, exit, and FLIP all go through the
  injectable `Play` type so the renderer stays testable with a stand-in and the
  Model is uninvolved (fire-and-forget). Do not animate outside `wiring.play`.
- **Reduced motion / WCAG 2.2 AA** — `waapiPlay` must continue to feature-detect
  WAAPI and honour `prefers-reduced-motion`, no-opping to a resolved promise;
  keyed reconcile must still place/remove the correct nodes when motion is off
  (`packages/plgg-view/src/Program/usecase/render.ts`).
- **Domain–DOM separation** — `Motion`/`Frame`/`key` stay pure and DOM-free in
  `Html/model`; only `Program/usecase/render.ts` touches the DOM/WAAPI
  (`packages/plgg-view/src/Html/model/Attribute.ts`).
- **Uniform children at the data layer** — children remain
  `ReadonlyArray<Html<Msg>>`; the key rides in the attribute list, so the typed
  content model (`Html<Msg, T>`) is untouched (`packages/plgg-view/src/Html/model/element.ts`).
- **Index-path parity** — the index fallback keeps its current behaviour,
  including trailing-surplus exit motion; do not regress the existing 94 tests
  (`packages/plgg-view/src/Program/usecase/render.spec.ts`).
- **Mid-exit identity** — a node fading out is held in the DOM; it must be
  excluded from key-matching (`exiting` WeakSet) so a returning key lands on a
  fresh node, never the one fading away.
- **Built `dist/` consumers** — the example resolves plgg-view via its published
  `dist/*.d.ts`; rebuild plgg-view before type-checking `packages/example`.
- **Coverage > 90%** — `packages/plgg-view/vite.config.ts` sets the threshold to
  91 on statements/branches/functions/lines; new branches (motion present vs
  none, reduced-motion on/off, reorder vs insert vs delete, keyed vs index,
  tag-change replace, mid-exit skip) must be exercised.
- **Follow-up (out of scope)** — Model-driven transition *orchestration*
  (an `animationend → Msg` so the app can sequence "fade col2 out, then col3 in")
  is a separate, larger ticket; this ticket keeps motion fire-and-forget.

## Note

An implementation matching these steps already exists **uncommitted** in the
working tree (this ticket was written to capture it after the fact). `/drive`
should validate it against the steps above — re-run tsc, the full test suite,
and the coverage gate — adjust as needed, then archive and commit.

## Discussion

### Revision 1 - 2026-06-09T20:27:24+09:00

**User feedback**: After delivery was fixed (a separate cache-busting ticket),
the developer reported the micro-interactions still did not work — adding a task
showed no fade-in and deleting showed "nothing improved" — and directed me to
check the implementation rather than the rendering/delivery path.

**Root cause (found via a focused code review)**: `enterOf`/`exitOf` in
`render.ts` folded the `Anim` channel with `content.enter`/`content.exit`, which
*overwrites* the accumulator. The example's `<li>` carries both `fadeIn`
(`enter: some, exit: none`) and `fadeOut` (`enter: none, exit: some`); because
`fadeOut` is last, its `enter: none` clobbered the earlier `fadeIn`, so
`enterOf` returned `none` and `createNode` never played the enter motion — add
never faded in. (Exit survived only by attribute order.) This predates the keyed
work but breaks the feature's goal.

**Ticket updates (Implementation Steps)**: Added a step — introduce a `keepSome`
combinator (last-`some`-wins) and use it in both the `enterOf` and `exitOf`
`anim$()` arms so each channel is collected from *any* `Anim` directive
regardless of order. Added a regression test in `render.spec.ts`: an element
with both `fadeIn` and `fadeOut` plays the enter motion on create and the exit
motion on removal.

**Direction change**: None to the design; this is a correctness fix to the
enter/exit motion extraction that the keyed/FLIP feature depends on.

### Revision 2 - 2026-06-10T00:57:02+09:00

**User feedback**: With enter fixed, add fades in, but **delete still snaps** —
"a sudden change of the padding inside the task list item." The developer
stepped back to the root design question (ask Codex): is the *render strategy*
(vDOM diff vs Svelte-compiled vs signals) the issue, and how should we commit to
motion design — "micro-interaction friendly by design."

**Decision (two independent analyses — Codex + Claude — converged)**: Motion
friendliness is **orthogonal to render strategy**; it is an element-lifecycle
concern (mount / deferred-removal / move + measurement) that sits on top of any
strategy. **Keep the vDOM diff** (signals contradict the single-immutable Elm
model; a Svelte-style compiler violates the minimize-complexity constraint). The
current `takeOutOfFlow` exit (position:absolute + pinned width/height) is the
defect: with content-box sizing it grows the box by its padding → the visible
"padding jump", and it never collapses the row's *space*.

**Ticket updates (supersedes Implementation Step 7 and the FLIP-on-removal
role)**:
- **Exit becomes an in-flow height-collapse.** On keyed removal: measure
  `offsetHeight`, set `overflow: hidden`, animate `height: measured → 0`
  *concurrently* with the declared opacity/transform exit motion, and detach in
  the animation's finish. Survivors then close the gap through **natural layout
  reflow** as the height shrinks — no out-of-flow trick, no padding jump.
- **Remove `takeOutOfFlow`.** FLIP is **retained for true reorders only** (a
  synchronous index change); it no longer participates in removal (the exiting
  node stays in flow and collapses, so survivors aren't measured as "moved" in
  the synchronous pass).
- The height-collapse is a **confined DOM seam** alongside `waapiPlay`: it
  feature-detects WAAPI and honours `prefers-reduced-motion` (reduced → instant
  detach). Removal stays gated on the injectable `Play` (the opacity exit) so it
  remains unit-testable; the collapse runs concurrently for the same duration.
- **No model change / no new builder**: the existing `fadeOut(150)` supplies the
  opacity exit + duration; the renderer auto-collapses keyed list exits. "By
  design" = key a list → smooth add (fade) / remove (collapse) / move (FLIP).
- **Test updates**: replace the `position:absolute` assertion in the
  middle-delete test with an `overflow:hidden` + deferred-removal assertion; add
  a collapse test (stub `node.animate` to capture the `height` keyframes).

**Direction change**: Commit motion to the runtime element lifecycle on the
existing vDOM (not a render-strategy switch). Exit = collapse, enter = fade,
move = FLIP. **Coordinated/sequenced transitions** (Model phases
`entering`/`exiting`/`settling` + `animationend → Msg`, and declarative
`delay`/`stagger` on `Anim`) remain a **separate follow-up ticket** — the
column-reveal orchestration — not built here.

### Revision 3 - 2026-06-10T11:43:36+09:00

**User feedback**: After the full-footprint collapse landed (height + padding +
border + margin → 0, and the demo's list spacing moved from flex `gap` to
per-item margin so it collapses too), middle deletes read correctly — but
deleting the **bottom** row still showed an "unnecessary shrink": the row
visibly squished to nothing even though nothing was below it to slide up.

**Ticket updates (Implementation Steps)**: A collapse exists only to let
followers glide into the gap, so it is now conditional — `playKeyedExit` checks
`hasInFlowFollower` (next element siblings, skipping nodes already mid-exit):
with a follower → fade + collapse; **last in-flow row → fade only, no squish**.
Deleting the *only* remaining item takes the index fallback (empty new list)
which already fades without collapsing — consistent. Tests updated: the collapse
test now removes a row *with* a follower; a new test locks "last row fades only
(no collapse, overflow untouched, held until the fade ends)".

**Direction change**: None — refines the collapse rule to "collapse only when
the gap needs closing."

### Revision 4 - 2026-06-10T11:43:36+09:00

**User feedback**: "when delete a task nothing is fixed" — the Revision-3
last-row tweak changed nothing visible.

**Root cause (the actual bug, found by re-reading the reorder step)**: the
keyed reorder walk (`finalNodes` anchor loop) still assumed the takeOutOfFlow
era — its comment read "exiting nodes (now out of flow) drift to the end
without affecting layout". With the in-flow collapse, that walk **displaces the
dying row**: deleting `b` from `[a, b, c]` ran `insertBefore(c, b)`, so the DOM
became `[a, c, b]` and the deleted row **teleported to the bottom of the list**,
collapsing there. This is why every report said the shrink happened "at the very
last item" regardless of which row was deleted, and why Revision 3 (a last-row
fade-only rule) was symptom-chasing the wrong end.

**Ticket updates (Implementation Steps)**: the anchor walk now skips mid-exit
siblings (`pastExiting`) so an exiting node **stays exactly where it is** and
collapses in place while survivors close the gap via layout. Revision 3's
`hasInFlowFollower` conditional is **reverted** — collapse is unconditional
again (a bottom-row fade-only exit would end in the container-edge snap the
collapse exists to prevent). Tests: replaced the "last row fades only" test with
a regression test that an exiting middle row keeps its DOM position (survivors
don't leapfrog it).

**Direction change**: None — this completes the in-flow collapse design;
Revision 3's conditional rule is withdrawn.

### Revision 5 - 2026-06-10T11:43:36+09:00

**User feedback**: clarified the remaining case — "when only one item left and
deleted, padding shrink in sudden": emptying the list snaps.

**Root cause**: the keyed-path gate required `newChildren.length > 0`, so
deleting the *only* item routed to the index fallback, whose surplus removal
plays the fade but never collapses — the row's footprint vanished at detach.

**Ticket updates (Implementation Steps)**: extracted an `allKeyed` helper; the
dispatcher now also takes the keyed path when a fully-keyed list empties
(`newChildren.length === 0 && allKeyed(oldChildren)`), so the last row exits
with fade + collapse like every other row. Unkeyed lists that empty keep the
index path. New test: "deleting the ONLY remaining keyed row still exits via
the keyed path (collapse, no snap)".

**Direction change**: None — closes the last inconsistent exit path.

### Revision 6 - 2026-06-10T11:43:36+09:00

**User feedback**: still snapping on the only-item delete — now precisely "the
padding left of the checkbox obviously shrinks in sudden."

**Root cause (found empirically — headless-chromium probe sampling the dying
row per frame)**: not the renderer. `application.paint` did
`sheet.set(collectCss(html))` — the managed `<style>` was rebuilt from the
**new** tree only. Deleting the *only* row leaves a tree with no `li` atoms, so
the row's padding/border/background rules were stripped from the stylesheet
while the exiting node was still in the DOM mid-animation. The probe showed it:
middle delete keeps `paddingLeft: 12px` throughout; only-item delete has
`paddingLeft: 0` from the first frame after click (vertical padding survived
only because the collapse animation held it). Middle deletes masked the bug
because surviving rows kept the shared atomic rules alive.

**Ticket updates (Implementation Steps)**: the client sheet is now
**insert-only** — atomic rules are content-hashed (same class ⇒ same
declaration, forever), so accumulating a union is always correct and rules
outlive trees that drop them. `collectCss` refactored into `collectCssRules`
(data) + `renderCssRule`; `makeSheet().set(css)` became `add(rules)` with a
`known` Map keyed by className; `application`/`sandbox` paint with
`sheet.add(collectCssRules(html))`. New regression test: a rule the new tree
dropped stays in the sheet.

**Direction change**: None — completes the deferred-removal lifecycle: an
exiting node keeps its DOM position (Rev 4), its exit path (Rev 5), **and its
styles (Rev 6)**.

## Final Report

Validated the working-tree implementation against the steps above and archived
it. `scripts/tsc-plgg.sh` clean; plgg-view full suite **109 tests pass**
(including the keyed reconcile + FLIP + collapse section in `render.spec.ts`);
coverage **97.28% stmts / 97.03% branch / 94.88% funcs / 97.18% lines**, above
the 91% gate on every metric.

### Discovered Insights

- **Insight**: `plgg-server` vendors a *copy* of `plgg-view`'s `collectCss` at
  build time, so its `dist/` went stale after the `Key` variant landed and its
  matcher fell through on keyed elements — emitting a junk
  `.undefinedundefined{undefined:undefined}` rule into every SSR `<style>`.
  Rebuilding `plgg-server` cleared it.
  **Context**: any change to a `plgg-view` fold/`match` that `plgg-server`
  re-exports requires rebuilding `plgg-server` too; the cross-package staleness
  is invisible to `tsc` and only shows at runtime in SSR output.
