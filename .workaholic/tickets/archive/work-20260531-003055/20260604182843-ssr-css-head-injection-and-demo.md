---
created_at: 2026-06-04T18:28:43+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Infrastructure]
effort: 1h
commit_hash: 4166039
category: Changed
depends_on: [20260604182842-plgg-view-atomic-css-extraction.md]
---

# SSR `<head>` CSS injection + restyle the example with hover/focus

## Overview

Ticket 1 adds atomic `css()` with `:hover`/`:focus` and a `collectCss(html)` fold
that produces the exact stylesheet, plus client-side injection. This ticket wires
the **server** half and proves it: `pageResponse`/`htmlDocument` inject
`collectCss(root)` into `<head>` so the first paint is fully styled (critical CSS
inlined, no extra request), and the example To-Do is restyled with `css()` —
buttons and rows gaining real hover/focus feedback — then redeployed so
`plgg-example.qmu.dev` shows it.

## Key Files

- `packages/plgg-server/src/View/usecase/htmlDocument.ts` — inject the collected
  sheet: `<head>…<style>${collectCss(opts.root)}</style></head>`. Import
  `collectCss` from `plgg-view` (the core, SSR-safe entry). The body still uses
  `renderToString(opts.root)`; both fold the same tree.
- `packages/plgg-server/src/View/usecase/response.ts` — `pageResponse` flows
  through `htmlDocument`; no change beyond what htmlDocument does, but confirm.
- `packages/plgg-server/src/View/usecase/htmlDocument.spec.ts` /
  `response.spec.ts` — assert the document `<head>` contains a `<style>` with the
  expected rule when the root uses `css(...)` (and stays empty/absent when it does
  not).
- `packages/example/src/app.ts` — restyle with `css()` from `plgg-view/style`
  (via the `sx` namespace): replace the `class_` + `style_` combo on interactive
  elements with `css("hook", …, hover(...))` so the filter buttons, Add button,
  and delete button darken on hover and show a focus ring; keep the semantic class
  hooks the tests select on as the leading string arg to `css(...)`.
- `packages/example/src/app.spec.ts` — the class hooks remain (passed into
  `css()`), so selectors keep working; adjust only if a hook name moves.
- `workloads/development/Dockerfile` — already builds plgg-view + plgg-server +
  example; rebuild the image to redeploy.

## Implementation Steps

1. **Head injection** (`htmlDocument.ts`): call `collectCss(opts.root)` and place
   its output in a `<style>` inside `<head>` (after the `<title>`). Empty result
   → emit nothing (or an empty `<style>`; pick and test). Escape is unnecessary
   (the CSS is generated from typed tokens, not user input) — but note it.
2. **Server tests**: a `css(...)`-bearing root yields a document whose `<head>`
   has the atom's rule; a plain root yields no rule. The body markup still carries
   the atomic `class`es (from ticket 1's renderToString arm).
3. **Restyle the example** (`app.ts`): move the interactive elements to `css()`
   with `hover`/`focus` — e.g. the Add/delete/filter buttons get a hover
   background shift and a `focus` outline; the search/title inputs get a `focus`
   border-color. Keep `style_` for static layout where states aren't needed (both
   coexist). Preserve the test class hooks via the leading string arg.
4. **Verify**: plgg-server tsc + vitest; example tsc + vitest (existing
   text/markup + class-hook assertions stay green); plgg-view unaffected;
   `scripts/tsc-plgg.sh` / `test-plgg.sh`. Rebuild plgg-view + plgg-server dist so
   the example consumes them.
5. **Redeploy**: rebuild the image and restart the container —
   ```
   docker build -f workloads/development/Dockerfile -t plgg-example .
   docker rm -f plgg-example
   docker run -d --restart unless-stopped -p 3001:3000 --name plgg-example plgg-example
   ```
   Verify `curl localhost:3001/` → 200, `<head>` contains `<style>`, and body
   elements carry atomic `class`es. The `plgg-example.qmu.dev → :3001` tunnel
   route already exists — no cloudflared change.

## Considerations

- **Depends on ticket 1** — `collectCss` and `css()` must exist (and plgg-view +
  plgg-server dist rebuilt) before this can land.
- **SSR/CSR class agreement** — the server injects the sheet AND ships the atomic
  classes; the client (ticket 1) injects the same rules by the same content hash,
  so there is no flash/mismatch (the server sheet already covers the first paint).
  Note the client `<style data-plgg-style>` and the SSR `<style>` may briefly
  coexist — both carry identical rules, so it is harmless; a later refinement
  could have the client adopt the server sheet (`htmlDocument.ts`, client
  injection).
- **Operation** (`standards:operation`) — redeploy is the dev docker image +
  container restart on `:3001`; the shared cloudflared connector is **not**
  touched (the route exists). Confirm the public URL after restart
  (`workloads/development/`).
- **A11y** (`standards:design`, WCAG 2.2 AA) — `:focus` styles must give a visible
  focus indicator (an outline/ring), not only `:hover`, so keyboard users get
  feedback (`packages/example/src/app.ts`).
- **Escaping** — `collectCss` output goes inside `<style>`; values come from typed
  tokens (no user input), so injection is not a concern here, but keep token
  values free of `</style>`-breaking content (`htmlDocument.ts`).

## Final Report

Development completed as planned, plus one small plgg-view utility added for the
demo (`outline`, for an accessible `:focus` ring). `htmlDocument` inlines
`collectCss(root)` into `<head>` (omitted when empty); `collectCss` is re-exported
through plgg-server's render surface. The example's interactive elements moved to
`css()` with `:hover` (shadow lift) + `:focus` (outline) states. Redeployed:
`plgg-example.qmu.dev`'s served `<head>` carries the atomic sheet with `:hover`/
`:focus` rules and the body carries the atomic classes. plgg-server tsc + 75
tests, example tsc + 17 tests, plgg-view 99, core tsc clean.

### Discovered Insights

- **Insight**: `css()` and `class_` both own the element's `class`, so they
  collide (last-wins) — but `css()` and `style_` do **not** (different attributes:
  `class` vs `style`). **Context**: in the demo, interactive elements that need
  hover/focus use `css("hook", …)` (the hook string preserves the test selectors
  and replaces `class_`), while static-layout elements keep `class_` + `style_`
  unchanged. Knowing which pairs collide lets you mix the two styling modes per
  element without a renderer-level class-merge.
- **Insight**: the SSR-injected `<head><style>` and the client `<style
  data-plgg-style>` both end up in the DOM, carrying **identical** rules (same
  content hash from the same atoms), so the duplication is harmless and there is
  no FOUC — the server sheet already styles the first paint before the client
  runtime mounts. A future refinement could have the client adopt the server sheet
  instead of adding its own (`htmlDocument.ts` + the client injection).
- **Insight**: re-exporting `collectCss` through plgg-server's existing
  `View/usecase/renderToString.ts` thin re-export (next to `renderToString`) keeps
  `htmlDocument` on one import surface (`plgg-server/index`) and mirrors how SSR
  already borrowed `renderToString` from plgg-view — the same tree is folded twice
  (markup + sheet), cheaply.
