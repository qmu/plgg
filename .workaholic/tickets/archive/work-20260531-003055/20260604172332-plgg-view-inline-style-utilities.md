---
created_at: 2026-06-04T17:23:32+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 2h
commit_hash: 180a49e
category: Added
depends_on:
---

# plgg-view: type-driven inline-style utilities (+ restyle the example)

## Overview

A zero-dependency, **type-driven inline-style** utility system for plgg-view — a
from-scratch styling layer that fits the project rather than pulling in Tailwind
or Bootstrap. Decided with the user: **inline-style only** (no stylesheet, no
class extraction) and **utilities only** (a Tailwind-style atomic vocabulary, no
component/recipe layer).

The whole thing reuses the existing attribute channel: `style_(p(3), flex,
gap(2))` composes typed utilities into a single `style="padding:.75rem;display:
flex;gap:.5rem"` via `attr("style", …)`. **Verified**: `style` passes plgg-view's
`isSafeAttrName` and `renderToString` emits it (`<div style="…">x</div>`), so this
is **zero changes to plgg-view core** — one new pure module producing
`Attribute<never>`, exactly like `class_`/`fadeIn`.

It is pure and SSR-safe (no DOM), so it lives in the core entry: `import {
style_, p, flex, … } from "plgg-view"`. Honest, accepted limit: inline styles
cannot express `:hover`/`:focus`/media/pseudo (the same wall the animation work
hit — interaction states need real CSS). The atomic-extraction upgrade (typed
atoms → a fold-emitted stylesheet) stays open as a future layer if states are
wanted; this ticket is the minimal, pure first step (emergent-design-system:
start with one rule, grow later — possibly graduating to a standalone
`plgg-style` peer package).

The demo restyles the example To-Do so `plgg-example.qmu.dev` actually looks
designed.

## Key Files

- `packages/plgg-view/src/Style/` — **new module**. `model/Style.ts` (the `Style`
  declaration type + `Styles`), `model/token.ts` (typed scales/tokens), the
  utility builders, and `style_`. Colocated `*.spec.ts`.
- `packages/plgg-view/src/Html/model/Attribute.ts` — reused as-is: `style_`
  returns `attr("style", joined)`; no edit needed (the `Attr` variant already
  carries `name`/`value`).
- `packages/plgg-view/src/Html/usecase/escape.ts` — `isSafeAttrName`
  (`/^[A-Za-z_:][-A-Za-z0-9_:.]*$/`) accepts `style`; `escapeAttr` escapes the
  value on SSR (harmless for our keyword/number/hex values). No edit.
- `packages/plgg-view/src/index.ts` → `Html/…` barrels — add a `Style` barrel to
  the core export chain so `style_`/utilities surface from `"plgg-view"`. Confirm
  the export path (the core entry is `export * from "plgg-view/Html"`; add a
  sibling `export * from "plgg-view/Style"` in `src/index.ts`).
- `packages/plgg-view/src/Program/usecase/render.ts` — no change; `style` is a
  plain static attribute (`setStaticAttr` → `setAttribute("style", …)`), not a
  value/checked property, so re-renders patch it correctly.
- `packages/example/src/app.ts` — **demo**. Style the header/form/filter
  buttons/todo rows/delete button with `style_` utilities (filter "selected"
  state via a conditional `style_`). Keep `fadeIn`/`fadeOut`.
- `packages/example/README.md` — add the styling capability line.
- `packages/example/src/app.spec.ts` — existing tests assert text/markup, not
  styles; keep green (adjust selectors only if a structural change is made).
- `workloads/development/Dockerfile`, `compose.yaml` — the demo is redeployed by
  rebuilding this image (no Dockerfile change needed; it already builds plgg-view
  + example).

## Implementation Steps

1. **`Style` model** (`Style/model/Style.ts`): `type Style = Readonly<{ prop:
   SoftStr; value: SoftStr }>;` and `type Styles = ReadonlyArray<Style>;`. A tiny
   `decl(prop, value): Styles` helper (`[{ prop, value }]`).
2. **Tokens** (`Style/model/token.ts`): `spacing(step: number): SoftStr =>
   \`${step * 0.25}rem\`` (Tailwind scale; `p(3)` → `0.75rem`). Closed unions +
   maps: `Color = "surface"|"surface-2"|"primary"|"text"|"muted"|"border"|
   "danger"` → values; `Radius = "sm"|"md"|"lg"|"full"`; `FontSize = "sm"|"base"|
   "lg"|"xl"|"2xl"`; `Shadow = "sm"|"md"|"lg"`. Each maps via an exhaustive
   `match`/record keyed by the union (compile error on unknown token — that is the
   type-driven win over stringly classes).
3. **Utilities** (each returns `Styles`):
   - layout: `flex`, `flexCol`, `inlineFlex`, `block`, `grid` (constants);
     `items(x)`, `justify(x)`, `gap(n)`, `wrap`.
   - spacing: `p,px,py,pt,pr,pb,pl`, `m,mx,my,mt,mr,mb,ml` (`(n: number) =>
     Styles`; `px`/`py`/`mx`/`my` emit the two long-hands).
   - sizing: `w(n)`, `h(n)`, `wFull`, `hFull`, `maxW(n)`, `minW(n)`.
   - typography: `text(size: FontSize)`, `weight(w: number)`, `color(c: Color)`,
     `center`/`left`/`right` (text-align).
   - background/border: `bg(c: Color)`, `rounded(r: Radius)`, `border` (1px solid
     the `border` token), `borderColor(c: Color)`.
   - effects: `shadow(s: Shadow)`, `opacity(n: number)` (**document the range —
     use 0..1**), `pointer` (`cursor:pointer`).
4. **`style_`** (`Style/usecase/style_.ts` or alongside): `style_(...parts:
   ReadonlyArray<Styles>): Attribute<never>` — flatten `parts`, reduce into a
   `Map<prop, value>` so a later declaration of the same prop wins, join as
   `prop:value;…`, return `attr("style", joined)`. Empty input → `attr("style",
   "")` (or omit — pick and test).
5. **Barrel exports**: add `Style/index.ts` and wire it into the core entry so the
   public surface is `import { style_, p, flex, bg, … } from "plgg-view"`.
6. **Tests** (`Style/**/*.spec.ts`, keep plgg-view ≥91%): representative utilities
   (`p(3)` → `[{prop:"padding",value:"0.75rem"}]`, `px(3)` → left+right, `flex` →
   `display:flex`, `bg("primary")` → mapped value, `rounded("md")`, `shadow("sm")`,
   `gap(2)` → `gap:0.5rem`); `style_` flatten + dedup-last-wins + join; a
   `renderToString` case that `style_(...)` emits the expected `style="…"`. Cover
   every token-union branch (or keep the vocabulary tight enough that the suite
   does) so coverage holds.
7. **Demo** (`packages/example/src/app.ts`): apply `style_` to the toolbar, filter
   buttons (selected vs not via a conditional `style_`), the form, todo rows, and
   the delete button so the app looks intentional. Update the example README's
   capability note. Run example tsc + vitest (existing assertions are
   text/markup-based — keep them green).
8. **Redeploy the demo**: rebuild and restart the container so the public URL
   reflects it:
   ```
   docker build -f workloads/development/Dockerfile -t plgg-example .
   docker rm -f plgg-example
   docker run -d --restart unless-stopped -p 3001:3000 --name plgg-example plgg-example
   ```
   The cloudflared route (`plgg-example.qmu.dev → :3001`) already exists — no
   tunnel change. Verify `curl localhost:3001/` → 200 with `style="…"` present.
9. **Verify**: plgg-view `npm run tsc` + `vitest` (≥91%); example `npm run tsc` +
   `vitest`; `scripts/tsc-plgg.sh` / `scripts/test-plgg.sh` for core. Rebuild
   plgg-view dist so the example consumes the new exports.

## Related History

- [20260604004534-plgg-view-transition-directive.md](.workaholic/tickets/archive/work-20260531-003055/20260604004534-plgg-view-transition-directive.md)
  — the `Anim` directive established the "styling/animation as typed `Attribute`
  data" pattern and proved the renderer treats non-attribute metadata cleanly;
  this is the same shape (typed data → an attribute), and it also documented the
  inline-vs-real-CSS limit this ticket consciously accepts.
- [20260604154845-example-animate-todo-items.md](.workaholic/tickets/archive/work-20260531-003055/20260604154845-example-animate-todo-items.md)
  — most recent `example/src/app.ts` change (the `viewTodo` `li` carries
  `fadeIn`/`fadeOut`); this ticket adds `style_` alongside.

## Considerations

- **Zero plgg-view core change** — `style_` reuses `attr("style", …)`; `style`
  passes `isSafeAttrName` and SSR-escapes its value. If a future need arises to
  collect rules (extraction), that becomes a new `Attribute` variant like `Anim`;
  out of scope here (`packages/plgg-view/src/Html/usecase/escape.ts`).
- **Inline-only limit (accepted)** — no `:hover`/`:focus`/media/pseudo. Document
  it in the module doc and the example README so it is not mistaken for a Tailwind
  replacement. Interaction states would need the atomic-extraction layer (a
  fold-emitted stylesheet) — a named follow-up, not this ticket.
- **Dedup semantics** — `style_` must make later declarations win
  (`style_(p(2), p(4))` → `padding:1rem`), so conditional overrides compose
  predictably; assert it (`Style/usecase/style_.spec.ts`).
- **Type-driven tokens** (`standards:implementation`) — closed unions for
  color/radius/size with exhaustive `match` mapping; an unknown token is a compile
  error, the whole point versus stringly CSS classes (`Style/model/token.ts`).
- **Emergent design system** (`standards:design`) — ship a focused MVP vocabulary
  (enough for the To-Do app), not a Tailwind clone; grow per real need and
  consider extracting to a `plgg-style` package once it earns independence.
- **A11y / contrast** (`standards:design`, WCAG 2.2 AA) — pick token color values
  with adequate contrast (text on surface, danger on surface) so the demo is
  accessible by default (`Style/model/token.ts`, `packages/example/src/app.ts`).
- **Downstream rebuild** — the example consumes plgg-view's built `dist`; rebuild
  plgg-view before example tsc, and rebuild the docker image before the public URL
  reflects the styles (`workloads/development/Dockerfile`).
- **plgg-view's "minimal TEA" identity** — keep the Style module clearly separate
  and optional (tree-shakeable); it must not entangle the `Html`/runtime code
  (`packages/plgg-view/src/Style/`).

## Final Report

Development completed as planned, with two corrections to the ticket's plan (see
insights). Shipped `Style/` (Style/Styles/decl, typed token scales, ~45
utilities, `style_`) on a new `plgg-view/style` subpath; restyled the example and
redeployed — `plgg-example.qmu.dev` now serves a designed UI (inline styles
present in the SSR HTML). plgg-view tsc clean, **86 tests**, coverage 98.6% / 95.7%
/ 97.6% / 98.6% (gate 91%); example tsc clean, 17 tests; core tsc clean.

### Discovered Insights

- **Insight**: the utilities **cannot** be exported from the core `plgg-view`
  entry as the ticket assumed — `p` (padding) and `text` (font-size) collide with
  the Html element builders `p` (`<p>`) and `text` (text node), and two `export *`
  re-exporting the same name makes it an ambiguous/dropped export. **Context**:
  resolved by shipping the utilities on a dedicated **`plgg-view/style` subpath**
  (a third build entry + `./style` in package.json `exports`, mirroring
  `plgg-view/client`), and the canonical usage is a namespace import
  `import * as sx from "plgg-view/style"` so `sx.p`/`sx.text` coexist with the
  builders. Any "utility library that shares names with element builders" hits
  this — subpath + namespace is the pattern.
- **Insight**: reusing `attr("style", …)` meant **zero renderer/SSR changes** —
  `style` passes `isSafeAttrName`, `renderToString` emits it, and the diff/patch
  renderer treats it as a plain static attribute (verified by a render.spec test:
  the style attr is set and updated in place). The "typed data → existing
  attribute channel" shape (same as `class_`/`fadeIn`) keeps new view-vocabulary
  additions out of the core entirely.
- **Insight**: closed token sets are best modeled as `Record<Union, value>` rather
  than a `switch`/`match` — the `Record` is exhaustive at compile time (every key
  required), indexing `MAP[token]` returns the value type **without** triggering
  `noUncheckedIndexedAccess` (that only applies to index signatures, not
  finite-key records), and it has zero branches so coverage is trivial. Factoring
  the `p`/`m`/`w` family through a shared `lenProp`/`lenPair` factory also collapses
  ~18 utilities to one covered source location. Both keep the >91% gate easy.
