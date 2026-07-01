---
created_at: 2026-06-04T18:28:42+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 4h
commit_hash: 7fadb26
category: Added
depends_on:
---

# plgg-view: atomic CSS extraction (`css()` + `:hover`/`:focus`, fold-emitted sheet)

## Overview

The inline `style_` utilities cannot express interaction states (`:hover`,
`:focus`, …) — inline `style=""` has no selectors. This adds the **atomic CSS**
layer that does: typed atoms (reusing the existing `Style`/token vocabulary) →
**content-hashed atomic class names**, and the **fold harvests the exact CSS
used** and emits it. Because the view is typed data and `foldHtml` already walks
every node, extraction is exact and self-purging — no scanning, no PostCSS, no
build step (the plgg-native answer to Tailwind's JIT).

`style_` (inline) stays; `css(...)` is the new, parallel, class-based path:

```ts
css("todo", p(3), rounded("md"), hover(bg("primary"), color("primary-text")))
// → class="todo c1a2 c3b4 c5c6"  (a literal hook + atomic hashes)
// collected sheet: .c1a2{padding:0.75rem} .c3b4{border-radius:0.5rem}
//                  .c5c6:hover{background-color:#2563eb;color:#fff}
```

This ticket is the **plgg-view side**: the `Css` attribute variant, the
`css()`/`hover()`/`focus()`/`active()` builders, deterministic hashing, the
`collectCss` fold, the five `match(attribute)` arms the new variant forces, and
**client-side sheet injection** (the runtime appends newly-seen rules to a managed
`<style>` each render). The SSR `<head>` injection + the demo are the dependent
follow-up ticket.

## Key Files

- `packages/plgg-view/src/Html/model/Attribute.ts` — **core change** (mirrors the
  `Anim` precedent): add a fourth variant `Css` carrying
  `{ classes: SoftStr; rules: ReadonlyArray<CssRule> }`, the `CssRule` type
  (`{ className; selector; prop; value }`), and the `css$` matcher. `CssRule` is
  defined here (not imported from `Style`) so `Html` does not depend on `Style`
  (Style depends on Html, not the reverse).
- `packages/plgg-view/src/Html/usecase/renderToString.ts` — `renderAttribute`
  gets a `css$` arm → `class="${escapeAttr(content.classes)}"` (the atomic
  classes ship in the markup; the rules are emitted separately by `collectCss`).
- `packages/plgg-view/src/Html/usecase/mapHtml.ts` — `css$` pass-through
  (`box("Css")(content)`; carries no `Msg`).
- `packages/plgg-view/src/Html/usecase/collectCss.ts` — **new**.
  `collectCss(html): SoftStr` folds via `foldHtml` to a deduped set of `CssRule`
  (keyed by `className`) and renders `.cls{prop:value}` / `.cls:hover{…}`. The
  one place rules become a stylesheet. (Dedup so each atom appears once however
  many elements use it.)
- `packages/plgg-view/src/Style/usecase/css.ts` — **new**. `Variant` type +
  `hover`/`focus`/`active` (wrap `Styles` with a selector), the pure `hashClass`
  (deterministic djb2/FNV over `selector|prop:value` → `c<base36>` — **no
  `Math.random`/`Date`**, which are banned and would break determinism), and
  `css(...parts: ReadonlyArray<SoftStr | Styles | Variant>)`: a `string` part is a
  literal class hook, a `Styles` is atoms at the base selector, a `Variant` is
  atoms at its selector. Builds `CssRule`s + the joined class string → returns the
  `Css` attribute. (Discriminate parts: `typeof === "string"` → hook;
  `Array.isArray` → Styles; else Variant.)
- `packages/plgg-view/src/Program/usecase/render.ts` — **three** `css$` match arms
  (`applyAttribute` → `setAttribute("class", content.classes)`; `staticAttrsOf` →
  `acc.set("class", content.classes)` so patch updates it; `handlersOf` → no-op).
- `packages/plgg-view/src/Program/usecase/sandbox.ts` + `application.ts` —
  **client sheet injection**: after each render, `collectCss(view(model))` and
  ensure every rule is present in a managed `<style data-plgg-style>` in `document.head`
  (persistent `Set<className>`; append only new rules). A confined DOM seam,
  guarded for a missing `document` (SSR-import safety stays — these are already
  client-only).
- `packages/plgg-view/src/style.ts` (subpath barrel) — re-export `css`/`hover`/
  `focus`/`active` (and `collectCss` from the core for plgg-server to consume —
  decide: `collectCss` is SSR-safe, so export it from the **core** entry, not
  `/style`).
- Specs: `Style/usecase/css.spec.ts`, `Html/usecase/collectCss.spec.ts`,
  `Html/usecase/renderToString.spec.ts` (class emitted), `Program/usecase/*.spec`
  (class set/patched; `<style>` injected on mount under happy-dom).

## Related History

- [20260604172332-plgg-view-inline-style-utilities.md](.workaholic/tickets/archive/work-20260531-003055/20260604172332-plgg-view-inline-style-utilities.md)
  — shipped `style_` + the `Style`/token vocabulary this reuses, and explicitly
  named this atomic-extraction layer as the upgrade for interaction states.
- [20260604004534-plgg-view-transition-directive.md](.workaholic/tickets/archive/work-20260531-003055/20260604004534-plgg-view-transition-directive.md)
  — the `Anim` variant is the exact template: a new `Attribute` variant that SSR
  interprets specially and forces an arm at all five `match(attribute)` sites
  (`renderToString`, `mapHtml`, and `applyAttribute`/`staticAttrsOf`/`handlersOf`
  in `render.ts`). `foldHtml` itself does not match variants — `collectCss` lives
  in a fold algebra, not the variant arms.

## Implementation Steps

1. **`Css` variant** (`Attribute.ts`): add `CssRule`, the `Css` box
   (`{ classes; rules }`), and `css$ = () => pattern("Css")()`. Update the
   variant doc.
2. **Five arms** for the new variant (compiler-forced; `scripts/tsc-plgg.sh` red
   until done): `renderToString` (emit `class`), `mapHtml` (pass-through),
   `render.ts` ×3 (set/patch `class`; handlers no-op).
3. **`hashClass`** (`Style/usecase/css.ts`): pure deterministic string hash →
   `c<base36>`. Stable across runs (content-addressed).
4. **Variants**: `hover`/`focus`/`active` (`(...parts: ReadonlyArray<Styles>) =>
   Variant` with the matching selector).
5. **`css(...)`**: discriminate each part (string hook / `Styles` / `Variant`),
   build a `CssRule` per declaration (className = `hashClass(selector, prop,
   value)`), dedup classNames in order, return the `Css` attribute with the joined
   class string + the rule list.
6. **`collectCss`** (`Html/usecase/collectCss.ts`): a `foldHtml` algebra whose
   `element` gathers this node's `Css` rules plus its folded children's rules into
   a `Map<className, CssRule>`; render each as `.${className}${selector}{${prop}:
   ${value}}`, joined. Export from the **core** entry (SSR-safe).
7. **Client injection** (`sandbox.ts`/`application.ts`): a per-mount
   `ensureSheet()` keeping a `Set<className>` + a `<style data-plgg-style>` in
   `document.head`; after each render, append rules whose className is new. Cheap,
   idempotent, confined.
8. **Exports**: `css`/`hover`/`focus`/`active` from `plgg-view/style`;
   `collectCss`/`CssRule` from `plgg-view`.
9. **Tests** (≥91%): `hashClass` determinism + difference; `css()` builds classes
   + rules incl. a hook string + a variant; dedup; `collectCss` dedups across
   elements and renders base + `:hover`; `renderToString` emits the class; a
   render/sandbox spec asserts the class is set and a `<style>` appears in
   `document.head` after mount (happy-dom).
10. **Verify**: plgg-view tsc + vitest (≥91%); `scripts/tsc-plgg.sh` /
    `test-plgg.sh`; rebuild plgg-view dist.

## Considerations

- **Class authority** — `css()` is the single source of the element's `class`
  (literal hooks + atomic hashes), so it does **not** combine with `class_` on the
  same element (last-wins on the `class` attr). Document it; in the demo, replace
  `class_` with `css("hook", …)`. Avoids a class-merge special case in the
  renderer (`render.ts` `staticAttrsOf`).
- **Determinism/purity** — `hashClass` must be a pure content hash; `Math.random`
  and `Date` are banned in this runtime and would break SSR/CSR class agreement
  anyway. Same atom → same class on server and client, so the SSR-shipped sheet
  matches client-rendered classes (`Style/usecase/css.ts`).
- **Client injection is a runtime seam** — it touches `document.head`, so it lives
  in `sandbox`/`application` (already client-only), never the pure core or
  `collectCss`. Per-render dedup-append keeps it correct when styles appear on
  later-rendered nodes (`Program/usecase/sandbox.ts`).
- **Hash collisions** — content-hash of a small atom vocabulary; collision risk is
  negligible for a POC, but note it (a longer hash or a registry is the hardening
  path) (`Style/usecase/css.ts`).
- **Type-driven, no escape hatch** — the `Css` variant + exhaustive `match` arms;
  `Array.isArray`/`typeof` discriminate `css()` parts (no `as`). Keep the >91%
  gate (hash + collector branches covered).
- **Scope** — MVP variants are `hover`/`focus`/`active`; responsive/media variants
  are a documented follow-up (they need an `@media` wrapper in `collectCss`).

## Final Report

Development completed as planned. Shipped the `Css` variant + `CssRule`, the
`css()`/`hover`/`focus`/`active`/`hashClass` builders, the `collectCss` fold, the
seven `match(attribute)` arms, and per-mount client sheet injection. plgg-view tsc
clean, **99 tests**, coverage 98.4% / 96.1% / 97.1% / 98.3% (gate 91%); core tsc
clean; dist rebuilt for the dependent SSR ticket.

### Discovered Insights

- **Insight**: the new `Css` variant forced an arm at **seven** `match(attribute)`
  sites, not five — the ticket/Anim precedent counted five, but the animation work
  itself added two more (`enterOf`/`exitOf` in `render.ts`). **Context**: every
  reduce/fold over an attribute list that uses `match` is an exhaustive site, so
  the count grows as variants accumulate; `scripts/tsc-plgg.sh` (plgg's
  full-box-coverage `match`) is the exact checklist — let tsc enumerate them
  rather than guessing.
- **Insight**: client CSS injection is simplest as a **whole-sheet replace**, not a
  dedup-append `Set` (which the ticket sketched). `collectCss(tree)` is already
  deduped, so `styleElement.textContent = collectCss(html)` each render is correct
  and cheap; the per-mount `makeSheet()` owns one `<style data-plgg-style>` and
  `dispose()`s it on cleanup. Avoids tracking a className `Set` across renders.
- **Insight**: a `Record<Color, value>`-style closed map plus a **content-hash**
  class name means SSR and CSR derive identical classes from identical atoms with
  zero coordination — the server can ship the sheet AND the classes, and the client
  re-derives the same classes, so there is no hydration handshake. The hash must
  be pure (`Array.from(key).reduce(djb2)`); `Math.random`/`Date` are banned here
  and would break exactly this agreement.
