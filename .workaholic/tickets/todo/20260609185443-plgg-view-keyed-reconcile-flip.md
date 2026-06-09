---
created_at: 2026-06-09T18:54:43+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort:
commit_hash:
category:
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
