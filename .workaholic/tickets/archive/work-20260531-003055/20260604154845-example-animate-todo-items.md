---
created_at: 2026-06-04T15:48:45+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 0.25h
commit_hash: bc23e52
category: Changed
depends_on:
---

# example: demo plgg-view enter/exit transitions on todo items

## Overview

Every feature this branch shipped has a runnable demo in `packages/example`
**except** the plgg-view enter/exit transition directive (`fadeIn`/`fadeOut`/
`transition`, shipped in `3138798` with specs + a README note but no live use).
This closes that gap: give the To-Do app's `li` a `fadeIn` (enter) and `fadeOut`
(exit) so a newly added todo animates in and a deleted / filtered-out todo
animates out before it is removed — which also exercises the renderer's
deferred-removal exit lifecycle end-to-end in a real app.

Animation is plain `Attribute` data on the view tree, so this is a two-attribute
addition to one builder — the Model/`update`/`view` purity is untouched.

## Key Files

- `packages/example/src/app.ts` — `viewTodo` builds the `li`; add `fadeIn(150)`
  and `fadeOut(150)` to its attribute list. Import `fadeIn`/`fadeOut` from the
  existing `"plgg-view"` import block (core entry — already imports `class_`,
  `text`, etc.).
- `packages/example/README.md` — if it lists capabilities, add a line that list
  items animate in/out.
- `packages/example/src/app.spec.ts` — the add / delete / toggle DOM tests already
  cover `li` render + removal; happy-dom has no WAAPI so the play is a no-op and
  these keep passing. No animation-specific assertion is needed (animation is
  covered by plgg-view's own render specs); at most confirm an `li` still carries
  no stray attribute regression.

## Related History

- [20260604004534-plgg-view-transition-directive.md](.workaholic/tickets/archive/work-20260531-003055/20260604004534-plgg-view-transition-directive.md)
  — shipped the `Anim` directive + `fadeIn`/`fadeOut`/`transition` builders and the
  renderer enter/exit lifecycle this demos; its own Final Report notes the example
  had no demo (only README), which this ticket resolves.

## Implementation Steps

1. In `packages/example/src/app.ts`, add `fadeIn` and `fadeOut` to the existing
   `"plgg-view"` import.
2. In `viewTodo`, add `fadeIn(150)` and `fadeOut(150)` to the `li`'s attribute
   array (alongside `class_(...)`). Order does not matter — they are
   `Attribute<never>` like `class_`.
3. Verify `packages/example`: `npm run tsc` clean, `npx vitest --run` green
   (existing add/delete/toggle tests unaffected — WAAPI is absent under happy-dom,
   so enter/exit no-op there). Coverage stays at/above its current level.
4. If the example README enumerates demoed features, add the animation line.

## Patches

### `packages/example/src/app.ts`

> **Note**: speculative — match the exact import list and `viewTodo` `li`
> attribute array before applying.

```diff
   class_,
   type_,
   value_,
   name_,
   onInput,
   onSubmit,
   onClick,
   onChange,
+  fadeIn,
+  fadeOut,
 } from "plgg-view";
```

```diff
 const viewTodo = (todo: Todo): Html<Msg, "li"> =>
   li(
     [
       class_(
         todo.completed ? "todo done" : "todo",
       ),
+      fadeIn(150),
+      fadeOut(150),
     ],
     [
```

## Considerations

- **Demo parity** (working style: prove value with a runnable demo) — the point is
  that the example exercises *every* branch feature; this is the only gap
  (`packages/example/src/app.ts`).
- **happy-dom has no WAAPI** — the enter/exit play is a guarded no-op in tests, so
  existing specs pass unchanged; do not add brittle animation-timing assertions
  (`packages/example/src/app.spec.ts`).
- **`prefers-reduced-motion`** is honoured by the renderer already, so the demo is
  accessible by construction (no extra work here).
- **Exit lifecycle in a real browser** — a deleted/filtered-out `li` now lingers
  until its `fadeOut` finishes; with the index-based reconcile this is fine for
  single removals but rapid list churn can still collide (the documented
  outroing-set follow-up), acceptable for a demo (`packages/plgg-view`).

## Final Report

Development completed as planned. `viewTodo`'s `li` now carries `fadeIn(150)` +
`fadeOut(150)`, so every feature this branch shipped has a runnable demo. While
here, corrected the example README, which had drifted out of date across the
branch's three prior tickets. Example tsc clean; 17 tests pass (unchanged — the
directives are no-ops under happy-dom's missing WAAPI, as expected).

### Discovered Insights

- **Insight**: the example README still described the pre-branch world —
  `sandbox` (now `application`), "no diffing/no hydration" (the diff/patch
  renderer shipped this branch), and no mention of URL reflection or animation.
  **Context**: doc drift accumulated because the renderer, animation, and
  URL-reflection tickets each updated `packages/plgg-view`'s README but not the
  example's. When a feature spans a library + its showcase app, the showcase's
  prose is easy to forget — worth a glance at `packages/example/README.md` after
  any plgg-view runtime change.
