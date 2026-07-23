---
created_at: 2026-06-04T00:45:34+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 2h
commit_hash: f644a7b
category: Added
depends_on:
---

# plgg-view: built-in declarative enter/exit transition directive

## Overview

Give plgg-view first-class micro-interaction support **as a feature of the
library itself** — not an external react-motion-style dependency. Animation is
modeled as pure data on the view tree (`Anim`, a third variant of
`Attribute<Msg>`), the SSR-safe core only *declares* it, and the client renderer
is the single seam that *interprets* it via the native Web Animations API
(WAAPI). The `Model`/`update`/`view` never learn animation exists, and
plgg-view's "no `Cmd`/`Sub`" boundary holds — animation is a render-time
interpretation of view data, not a new effect channel.

This ticket delivers the **renderer-confined slice only**: enter animation on
node creation, and simple exit animation on node removal. Keyed reconcile / FLIP
reorder and the outroing-set lifecycle are explicit follow-ups (see
Considerations).

Why this shape: `Attribute<Msg>` already carries non-attribute metadata that SSR
drops — that is exactly what the `Handler` variant is. A transition is the same
kind of thing (per-node directive, meaningless on the server, interpreted by the
client), so it is one new union variant, with no surgery to `ElementContent` or
the homogeneous-children model.

## Key Files

- `packages/plgg-view/src/Html/model/Attribute.ts` — add the `Anim` variant to
  the `Attribute<Msg>` union, the `anim$` matcher, the `Motion`/`Frame` data
  types, and the `transition`/`fadeIn`/`fadeOut`/`slideIn` builders. Mirror the
  existing `box("Attr")`/`box("Handler")` + `pattern(...)` idiom.
- `packages/plgg-view/src/Html/usecase/renderToString.ts` — `renderAttribute`'s
  `match(attribute)` (≈ lines 44–53) needs an `[anim$(), (): SoftStr => ""]` arm.
  SSR drops animation exactly as it drops handlers.
- `packages/plgg-view/src/Html/usecase/mapHtml.ts` — **compiler-mandated** (not
  obvious): `mapAttribute`'s `match(attribute)` (≈ lines 20–35) is exhaustive and
  will not compile without an `anim$` arm. `Anim` carries no `Msg`, so the arm is
  a pass-through: `box("Anim")(content)`.
- `packages/plgg-view/src/Program/usecase/render.ts` — **three** more exhaustive
  match sites plus the two lifecycle hooks:
  - `applyAttribute` (≈ 205–228) — `anim$` arm; the ENTER play can live here or
    in the `createNode` element branch.
  - `staticAttrsOf` (≈ 264–281) — `anim$` arm returning the accumulator (`Anim`
    is not a static attribute).
  - `handlersOf` (≈ 284–309) — `anim$` arm returning the accumulator (`Anim` is
    not an event).
  - `createNode` element branch (≈ 246–259) — ENTER hook, after children append,
    before `return el`.
  - `patchChildren` surplus loop (≈ 484–488) — EXIT hook: defer `removeChild`.
- `packages/plgg-view/src/Html/usecase/foldHtml.ts` — context only. It passes the
  raw attribute list straight to `alg.element`, never matches `Attribute`
  variants, so `HtmlAlgebra`/`foldHtml` need **no** change. Confirms the new arms
  live in the renderers + `mapHtml`, not the fold.
- `packages/plgg-view/src/index.ts` / `src/Html/model/index.ts` — no manual edit:
  the core entry is `export * from "plgg-view/Html"` and the model barrel already
  re-exports `Attribute.ts`, so the new types/builders surface automatically.
- `packages/plgg-view/vite.config.ts` — coverage thresholds are **91%** on all
  four metrics; every new branch in `render.ts` must be covered. Test env is
  happy-dom, set **per-file** via `// @vitest-environment happy-dom` (see
  `render.spec.ts:1`), not globally.
- Specs to mirror: `src/Html/model/Attribute.spec.ts` (box-shape `toEqual`),
  `src/Html/usecase/renderToString.spec.ts` (the existing "drops event handlers"
  test is the template for the SSR-drop test), `src/Program/usecase/render.spec.ts`
  (the "children are appended and surplus removed" test, ≈ 263–282, is the exact
  path EXIT changes).

## Related History

The three archived plgg-view tickets establish the entire surface this extends —
the `Html<Msg>`/`Attribute<Msg>` model, the focus-safe diff/patch renderer, and
the typed content-model brand — but none touch animation; this feature is purely
additive, and the one real architectural gap it fills is that the renderer
removes nodes synchronously today (no exit-lifecycle seam).

- [20260531064930-redesign-plgg-view-renderer-as-diff-patch.md](.workaholic/tickets/archive/work-20260531-003055/20260531064930-redesign-plgg-view-renderer-as-diff-patch.md)
  — defines `makeRenderer`/`reconcile`/`createNode`/`patchChildren`; documents
  that node removal is immediate (no exit seam) and lists keyed reconcile / render
  batching / `Cmd`/`Sub` as out-of-scope follow-ups (same renderer this ticket
  edits).
- [20260530001735-replace-plgg-view-with-minimal-elm-architecture.md](.workaholic/tickets/archive/work-20260528-143038/20260530001735-replace-plgg-view-with-minimal-elm-architecture.md)
  — origin of the TEA architecture and the `Attribute<Msg>` `Box` union the new
  `Anim` variant joins; establishes that SSR drops handlers (the precedent for
  dropping `Anim`) and that effects/`Cmd`/`Sub` were deliberately excluded.
- [20260602013118-plgg-view-typed-content-model.md](.workaholic/tickets/archive/work-20260531-003055/20260602013118-plgg-view-typed-content-model.md)
  — most recent change to `Html.ts`/`element.ts`/`Attribute` and the model→barrel
  export chain the new types thread through; establishes the type-driven,
  cast-free, printWidth-50 idioms and the type-level testing pattern.

## Implementation Steps

1. **Model the data** (`Attribute.ts`). Add to the union:
   `| Box<"Anim", Readonly<{ enter: Option<Motion>; exit: Option<Motion> }>>`.
   Define `Motion = Readonly<{ from: Frame; to: Frame; durationMs: number;
   easing: SoftStr }>` and `Frame = Readonly<{ opacity: Option<number>;
   transform: Option<SoftStr> }>` — a deliberately small typed style subset
   (opacity + transform, the cheap-to-composite properties), not an arbitrary CSS
   bag (type-driven design: rich typing only where confusion can occur). Add
   `export const anim$ = () => pattern("Anim")();`. Import `Option`/`some`/`none`
   from `plgg`.
2. **Builders** (`Attribute.ts`), expression-style, returning `Attribute<never>`
   so they drop into any attribute list like `class_`:
   - `transition({ enter?, exit? }: Readonly<{ enter?: Motion; exit?: Motion }>)`
     → `box("Anim")({ enter: fromNullable(enter), exit: fromNullable(exit) })`.
   - `fadeIn(durationMs)`, `fadeOut(durationMs)`, `slideIn(from: SoftStr,
     durationMs)` — thin presets over `transition`. (`slideIn` uses
     `transform: translateY(${from})` → `translateY(0)`.) These mirror Svelte's
     `transition:`/`in:`/`out:` directive surface.
3. **SSR drop** (`renderToString.ts`). Add `[anim$(), (): SoftStr => ""]` to
   `renderAttribute` and import `anim$`. Animation never reaches the server.
4. **mapHtml pass-through** (`mapHtml.ts`). Add
   `[anim$(), ({ content }): Attribute<B> => box("Anim")(content)]` — required for
   `tsc` to pass even though the ticket's behavior is renderer-side.
5. **Renderer match arms** (`render.ts`). Add an `anim$` arm to `applyAttribute`,
   `staticAttrsOf`, and `handlersOf` (the latter two return the accumulator
   unchanged). Without all three, `scripts/tsc-plgg.sh` fails — plgg's `match`
   enforces full box-tag coverage at the type level.
6. **ENTER hook** (`render.ts`, `createNode` element branch). After children are
   appended, read the enter `Motion` off `content.attributes` (an `enterOf`
   helper paralleling `handlersOf`); if `Some` **and** motion is allowed (step 8),
   play it: `el.animate(framesOf(m), optsOf(m))`. Translate `Frame → Keyframe`
   purely by spreading each `Some` field via `matchOption` (no cast); `optsOf` →
   `{ duration: m.durationMs, easing: m.easing, fill: "forwards" }`. Comment the
   line as a confined DOM seam, matching `setHandler`'s style.
7. **EXIT hook** (`render.ts`, `patchChildren` surplus loop). Pair each surplus
   DOM node with its **old** vnode (`oldChildren[newChildren.length + i]`) to read
   its exit `Motion`. If `Some`, the node is an `HTMLElement`, and motion is
   allowed, play the exit and defer removal: `el.animate(...).finished.then(() =>
   parent.removeChild(surplus))`; otherwise `removeChild` immediately (today's
   behavior). Guard with `instanceof HTMLElement` — no cast.
8. **Feature-detect + reduced-motion gate.** Both hooks must (a) feature-detect
   `typeof el.animate === "function"` and no-op gracefully when absent (happy-dom
   has no WAAPI — see Considerations), and (b) honor `prefers-reduced-motion`: a
   reduced-motion match skips the tween and goes straight to the end state (enter:
   no animation; exit: immediate `removeChild`). Read the preference through a
   narrow `matchMedia` guard (no cast); treat an absent `matchMedia` as
   "motion allowed".
9. **Tests** (mirror existing specs; keep coverage ≥ 91%):
   - `Attribute.spec.ts` — `Anim` construction via each builder (`toEqual` the
     `{ __tag, content }` shape) and the `anim$` matcher.
   - `renderToString.spec.ts` — an `Anim`-bearing element renders with the anim
     attribute **omitted** (clone the "drops event handlers" test).
   - `render.spec.ts` — with `element.animate` **spied** (returns
     `{ finished: Promise.resolve(), cancel() {} }`, no cast): enter calls
     `animate` with the translated frames; exit **defers** `removeChild` until
     `finished` resolves; the no-motion / no-`animate` / reduced-motion paths
     remove synchronously. The existing surplus-removal test changes timing —
     update it.
10. **Verify**: `scripts/tsc-plgg.sh` clean, `scripts/test-plgg.sh` green
    (coverage gate included). No `plgg` core export changed, so no `plgg` rebuild
    is needed; confirm the demo/example still type-checks since exports widened.

## Patches

### `packages/plgg-view/src/Html/usecase/renderToString.ts`

> **Note**: speculative — line numbers/arm text from discovery snippets; verify
> the exact `renderAttribute` shape before applying.

```diff
   match(attribute)(
     [
       attr$(),
       ({ content }): SoftStr =>
         isSafeAttrName(content.name)
           ? ` ${content.name}="${escapeAttr(content.value)}"`
           : "",
     ],
     [handler$(), (): SoftStr => ""],
+    [anim$(), (): SoftStr => ""],
   );
```

### `packages/plgg-view/src/Html/usecase/mapHtml.ts`

> **Note**: speculative — compiler-mandated arm; `Anim` carries no `Msg`.

```diff
     match(attribute)(
       [attr$(), ({ content }): Attribute<B> => box("Attr")(content)],
       [
         handler$(),
         ({ content }): Attribute<B> =>
           box("Handler")({
             event: content.event,
             toMsg: (payload) => f(content.toMsg(payload)),
           }),
       ],
+      [
+        anim$(),
+        ({ content }): Attribute<B> => box("Anim")(content),
+      ],
     );
```

### `packages/plgg-view/src/Program/usecase/render.ts`

> **Note**: speculative — the three renderer match arms are mechanical; the
> ENTER/EXIT hooks are sketched and need the `enterOf`/`exitOf`/`framesOf`/
> `optsOf`/reduced-motion helpers built out.

```diff
   const staticAttrsOf = (attributes) =>
     attributes.reduce(
       (acc, attribute) =>
         match(attribute)(
           [attr$(), ({ content }) => acc.set(content.name, content.value)],
           [handler$(), () => acc],
+          [anim$(), () => acc],
         ),
       new Map(),
     );
```

## Considerations

- **Five exhaustive `match(attribute)` sites, not two.** plgg's `match` enforces
  full box-tag coverage at the type level, so `Anim` must be handled in
  `renderToString.ts`, `mapHtml.ts`, and three sites in `render.ts`
  (`applyAttribute`, `staticAttrsOf`, `handlersOf`). Miss any and
  `scripts/tsc-plgg.sh` fails. (`foldHtml.ts` does **not** match variants — no
  change there.)
- **happy-dom has no WAAPI** (`el.animate`, `Animation`, `KeyframeEffect`,
  `Animation.finished` are all `undefined` in the pinned version). The renderer
  **must** feature-detect `typeof el.animate === "function"` and no-op
  gracefully, and `render.spec.ts` must spy `element.animate` to return a
  `{ finished, cancel }` stub to drive/assert the deferred-removal branch — all
  **without casts** (`packages/plgg-view/src/Program/usecase/render.spec.ts`).
- **`prefers-reduced-motion` is first-class, not opt-in** (WCAG 2.2 AA;
  `standards:design` accessibility-first). A reduced-motion preference must take
  the no-animation path (enter → end state immediately; exit → immediate
  `removeChild`), so state is never conveyed by motion alone and AT/keyboard users
  are never stranded by a lingering exit (`render.ts`).
- **Honest limitation of this slice (the exit gap).** A node mid-exit still
  occupies its child index, so rapid list churn can collide with the index-based
  `patchChildren`. The full fix — an outroing-set + absolute-positioning of
  exiting nodes, plus a `key` on `ElementContent` for keyed reconcile and
  `animate:flip`-style reorder — is **out of scope** and a follow-up ticket. This
  slice delivers enter + simple exit only; document the limitation in the README's
  follow-ups table (`packages/plgg-view/src/Program/usecase/render.ts:445`).
- **Modeless** (`standards:design`): an exit transition must not introduce a
  blocking "animating mode" — interrupting, navigating, and dispatching further
  `Msg` must keep working while a node animates out.
- **Vendor neutrality** (`standards:implementation`): build on native WAAPI, no
  third-party animation library; `Anim`/`Motion`/`Frame` stay library-agnostic
  data so the renderer's interpretation could be swapped without changing the view
  contract.
- **Layer/dependency rules**: the `Anim`/`Motion`/`Frame` data types and builders
  live in the SSR-safe core (no DOM, no WAAPI import); only `render.ts` (the
  `plgg-view/client` subpath, the documented single mutable seam) calls
  `el.animate`. Core must never depend on the renderer.
- **No `index.ts` edit needed** — exports flow automatically through the existing
  barrels (`src/Html/model/index.ts` → `src/Html/index.ts` → `src/index.ts`).
  Verify after implementation rather than editing.

## Final Report

Development completed as planned. All five exhaustive `match(attribute)` sites
got the `anim$` arm, SSR drops the directive, and the renderer owns the
enter/exit lifecycle. 68 tests pass; coverage 98.2% statements / 95.3% branches /
97.2% functions / 98.1% lines (gate 91%). plgg-view builds, the core `plgg` tsc
and the downstream `example` package both type-check against the new exports.

### Discovered Insights

- **Insight**: happy-dom (pinned 15.x) ships **no** Web Animations API —
  `element.animate`, `Animation`, `KeyframeEffect`, `Animation.finished` are all
  `undefined`. **Context**: any future DOM-timing/animation work in plgg-view
  cannot rely on WAAPI in tests. The fix here was to make the play step an
  injectable `Play` seam on `makeRenderer` (defaulting to `waapiPlay`), so the
  renderer's enter/exit logic is tested with a controllable stand-in, and
  `waapiPlay` itself is unit-tested by stubbing `element.animate`/`window.matchMedia`
  via `Object.defineProperty` (whose `value` is untyped) — keeping the strict
  no-`as`/`any`/`ts-ignore` rule intact. Reuse this seam pattern for the planned
  spring/rAF follow-up.
- **Insight**: a `let x: T | null = null` reassigned **only inside a closure** is
  flow-narrowed to `null` at later use sites (the closure write is invisible to
  TS), so `x?.()` collapses to `never` ("not callable"). **Context**: bit the
  exit-deferral test; the house no-escape-hatch rule means you fix this by
  initialising with a real no-op value (`let settle: () => void = () => undefined`)
  rather than casting — worth knowing for any deferred/await test helper.
- **Insight**: adding one `Box` variant to `Attribute<Msg>` forced new arms in
  **five** exhaustive `match` sites (3 in `render.ts`, 1 each in `mapHtml.ts` and
  `renderToString.ts`), not the two the feature obviously touches. **Context**:
  plgg's `match` enforces full box-tag coverage at the type level, so the compiler
  is the checklist — `scripts/tsc-plgg.sh` red until every site is handled. Budget
  for this whenever a core union grows.
