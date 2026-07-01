---
created_at: 2026-06-04T22:04:38+09:00
author: a@qmu.jp
type: refactoring
layer: [UX, Domain]
effort: 1h
commit_hash: d850b13
category: Changed
depends_on:
---

# plgg-view: unify styling into one primitive (remove the `style_` / `css` split)

## Overview

We shipped **two** styling builders — `style_` (inline `style="…"`) and `css()`
(classes + an extracted `<style>` sheet). They are **not two kinds of thing**:
both are CSS, both are "style". The only real difference is *where the
declarations land* — an inline attribute vs. a stylesheet rule — and the sole
capability that buys is **selectors** (`:hover`/`:focus`/media), which inline
cannot express. So naming one `style` and the other `css` implies a category
distinction that does not exist — a misuse of established terms, and unnecessary
surface area.

**Collapse to one primitive.** Keep a single styling function, **`style_`**,
backed by the class/sheet mechanism (the strict superset — it does everything
inline did, *plus* selectors). Delete the inline `style_` and the `css` name. The
rare case that genuinely needs a dynamic inline value (e.g. `width:${pct}%`
changing every frame, which would mint a new hashed class per value) uses the
existing primitive **`attr("style", …)`**, documented as the escape hatch — no
second blessed API.

Net: one verb to "style an element" (mechanism hidden), honest naming, and the
SSR/CSR sheet story stays single.

## Key Files

- `packages/plgg-view/src/Style/usecase/css.ts` → **rename to `style_.ts`**;
  rename its public builder `css` → `style_` (keep `hover`/`focus`/`active`/
  `hashClass`/`Variant` and the `SoftStr | Styles | Variant` part handling). This
  becomes the one styling builder.
- `packages/plgg-view/src/Style/usecase/style_.ts` (the **old inline** one) →
  **delete** (its behaviour — `attr("style", joined)` — is superseded; the name
  is reused by the renamed builder).
- `packages/plgg-view/src/Style/usecase/index.ts` — drop the old `style_` export
  line; the renamed module now provides `style_`.
- `packages/plgg-view/src/Html/model/Attribute.ts`,
  `Html/usecase/collectCss.ts`, `Program/usecase/sheet.ts`,
  `Program/usecase/render.ts` (the `css$` arms),
  `renderToString.ts`/`mapHtml.ts`, `sandbox.ts`/`application.ts` — **unchanged
  mechanism.** The internal `Box` tag stays `"Css"` and the matcher `css$`
  (internal only — not user-facing; renaming would churn the seven `match`
  arms for no external benefit). Add a one-line note that `Css` is the runtime
  tag behind the public `style_`.
- `packages/plgg-view/src/Style/usecase/css.spec.ts` → rename to
  `style_.spec.ts`, `css` → `style_`. **Delete** the old inline
  `style_.spec.ts` (the `style="…"` behaviour is gone).
- `packages/plgg-view/src/Html/usecase/renderToString.spec.ts`,
  `Program/usecase/render.spec.ts`, `Program/usecase/application.spec.ts`,
  `Html/usecase/collectCss.spec.ts` — replace `css(` with `style_(`; the renderer
  test that asserted an **inline `style="…"`** attribute becomes a **`class="…"`**
  assertion (the surviving `style_` sets `class`, not `style`).
- `packages/plgg-server/src/View/usecase/htmlDocument.spec.ts` — `sx.css` →
  `sx.style_` (htmlDocument/`collectCss` themselves are unchanged).
- `packages/example/src/app.ts` — migrate every `sx.css(…)` **and** every old
  `sx.style_(inline)` to the single `sx.style_(…)`. Because `style_` is now the
  sole `class` authority, **fold the `class_("hook")` hooks into `style_` as a
  leading string arg** (`sx.style_("todo done", flex, …)`) on elements that had
  both — otherwise `class_` + `style_` set `class` twice and collide.
- `packages/example/README.md`, `packages/plgg-view`'s style docs — describe one
  primitive + the `attr("style", …)` dynamic escape; drop the "two modes" framing.
- `workloads/development/Dockerfile` — rebuild the image to redeploy the demo.

## Related History

- [20260604182842-plgg-view-atomic-css-extraction.md](.workaholic/tickets/archive/work-20260531-003055/20260604182842-plgg-view-atomic-css-extraction.md)
  — introduced `css()` + the extraction mechanism this keeps (renamed to
  `style_`); its Final Report already flagged the `css`/`class_` class-authority
  rule that this unification leans on.
- [20260604172332-plgg-view-inline-style-utilities.md](.workaholic/tickets/archive/work-20260531-003055/20260604172332-plgg-view-inline-style-utilities.md)
  — introduced the inline `style_` this removes, and the `Style`/token vocabulary
  both builders shared (kept).

## Implementation Steps

1. **Rename the builder**: `Style/usecase/css.ts` → `style_.ts`; `export const
   css` → `export const style_`; update its doc (one primitive; `attr("style",…)`
   is the dynamic escape). Keep `hover`/`focus`/`active`/`hashClass`/`Variant`.
2. **Delete** the old inline `Style/usecase/style_.ts` and its `.spec.ts`.
3. **Barrel** `Style/usecase/index.ts`: ensure exactly one `style_` is exported
   (from the renamed module) plus `utilities`.
4. **Specs**: rename `css.spec.ts` → `style_.spec.ts` (`css`→`style_`); in
   `render.spec.ts` turn the inline-`style` assertion into a `class` assertion;
   `css(`→`style_(` across `renderToString.spec`, `collectCss.spec`,
   `application.spec`, and plgg-server `htmlDocument.spec`.
5. **Example** (`app.ts`): `sx.css(`→`sx.style_(`; for every element that had
   `class_("hook")` + `sx.style_(inline)`, merge into one `sx.style_("hook", …)`
   and drop the `class_` (keep `class_` only if a hook is purely non-styling —
   none remain in this app). Verify the test selectors (`li.todo`,
   `.todo-filters button.filter.selected`, `input[name=…]`) still resolve (hooks
   ride as `style_` string args).
6. **Docs**: example README + the style module doc — one styling primitive,
   `attr("style",…)` escape, drop "two modes".
7. **Verify**: plgg-view tsc + vitest (≥91%); plgg-server tsc + vitest; example
   tsc + vitest; `scripts/tsc-plgg.sh` / `test-plgg.sh`. Rebuild plgg-view +
   plgg-server dist.
8. **Redeploy**: rebuild the docker image and restart the container on `:3001`
   (the `plgg-example.qmu.dev → :3001` route already exists; no cloudflared
   change). Confirm `curl localhost:3001/` → 200, `<head>` `<style>` present,
   body elements carry classes.

## Considerations

- **Behaviour shift, not just rename** — the surviving `style_` emits a `class`,
  not a `style` attribute. Any element mixing `class_` + `style_` must fold the
  hook into `style_` (single class authority), or the two `class` writes collide
  (`packages/example/src/app.ts`, `render.ts` `staticAttrsOf`).
- **Internal tag stays `Css`** — the public name is `style_`, but the runtime
  `Box` tag and `css$` matcher remain `"Css"`/`css$` (renaming churns seven
  exhaustive `match` arms for zero user-facing gain). Document the mapping so a
  reader isn't confused (`Html/model/Attribute.ts`).
- **The dynamic escape is `attr("style",…)`** — not a new API. Note it where a
  continuously-changing inline value is the right tool, so the removal of inline
  `style_` doesn't read as "you can't do inline" (`Style` module doc).
- **Simplicity over surface** (the whole point) — fewer concepts, one honest
  verb; do not re-add a parallel path. Responsive/`@media` and theming, if wanted
  later, extend the *one* primitive (a variant / token-var), not a second
  function.
- **Operation** — redeploy is the dev image + container restart only; the shared
  cloudflared connector is untouched (`workloads/development/`).

## Final Report

Development completed as planned. There is now **one** styling primitive,
`style_` (class/sheet-based, with `:hover`/`:focus`/`:active`); the inline `style_`
and the `css` name are gone, and `attr("style", …)` is the documented dynamic
escape. The example migrated cleanly (every `class_` styling hook folded into a
`style_` string arg), and the redeployed page is byte-for-byte equivalent in
behaviour (hover/focus intact, `<head>` sheet present, no inline `style=`).
plgg-view 94 tests, plgg-server 75, example 17; coverage 98.4% / 96.1% / 97.1% /
98.3% (gate 91%); core tsc clean.

### Discovered Insights

- **Insight**: the rename was a **behaviour change**, not just a name change — the
  surviving `style_` writes `class`, not the `style` attribute. So every element
  that previously paired `class_("hook")` with the inline `style_` had to fold the
  hook into `style_("hook", …)`; leaving both would write `class` twice and the
  renderer's `staticAttrsOf` last-wins map would drop one. **Context**: when a
  styling API becomes the sole `class` authority, semantic/test hooks must move
  *into* it — `class_` only survives for genuinely non-styling hooks (one
  remained: the example's `header`).
- **Insight**: keeping the internal `Box` tag `"Css"` + matcher `css$` while the
  public builder is `style_` was the right call — renaming the tag would have
  forced edits at all **seven** exhaustive `match(attribute)` arms for zero
  user-facing benefit. The public name and the runtime tag are allowed to differ;
  a one-line doc note bridges them (`Html/model/Attribute.ts`).
- **Insight**: the whole `style_`-vs-`css` episode is a naming lesson — both terms
  name the *same* thing (CSS/style); the real axis was "inline attribute" vs.
  "stylesheet rule", which neither name expressed. The fix wasn't a better pair of
  names but **one** primitive (the inline path was a strict subset). When two
  APIs differ only in an internal mechanism, that's a signal to collapse them, not
  to name them.
