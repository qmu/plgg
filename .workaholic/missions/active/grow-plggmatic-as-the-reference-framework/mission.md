---
type: Mission
title: Grow plggmatic as the reference framework
slug: grow-plggmatic-as-the-reference-framework
status: active
created_at: 2026-07-18T23:00:00+09:00
author: a@qmu.jp
assignee: a@qmu.jp
drive_authorized: true
tickets: []
stories: []
concerns: []
---

# Grow plggmatic as the reference framework

plggmatic now lives here, in the plgg monorepo, as a plgg-family package
(`packages/plggmatic`) beside `plgg`, `plgg-view`, and the rest. Its reference —
the concrete example it exists to realize — lives beside it at
`packages/plggmatic-example` (demo1, a contract-development business-management
app declared from scratch and rendered as a horizontal column strip). This
mission is the durable goal for developing that reference and the framework
under it.

## The direction (owner, 2026-07-18)

- **Grow plggmatic in plgg as a general framework that realizes the reference.**
  The reference (demo1) is not a throwaway demo; it is the proof-of-value the
  framework is measured against. Its DSL surfaces (Declare / Flow / Form /
  Layout / Catalog and the absorbed render engine) grow to express the
  reference cleanly and generally — a form found in the reference should be
  expressible in the framework, not special-cased.
- **The aim is to be, again, the base of qfs-viewer's horizontal-orientation
  layout.** qfs-viewer is going independent for now — it implements its column
  UI itself, faithfully *referencing* this exhibit rather than depending on the
  package. The long goal is that plggmatic grows general and solid enough that
  qfs-viewer's horizontal layout can rest on it once more. That is the target,
  not a near-term coupling.
- **The reference is a living, followable target.** It is developed with a hot
  reload dev environment (below), not frozen artifacts. A change to the
  framework or the reference is seen immediately.

## The dev environment (how to resume development)

- **Serve the reference with hot reload**: `cd packages/plggmatic-example &&
  npm run dev` → `http://localhost:51820` (plgg-bundle's dev server;
  `bundle.config.ts` carries the `dev` section — port 51820, watch `src`,
  allowed hosts `localhost` and `plggmatic-reference.qmu.dev`). An edit under
  `src/` rebuilds and the browser reloads over SSE, no restart.
- **Live**: `https://plggmatic-reference.qmu.dev` fronts that serve through the
  shared `qmu-dev` cloudflared tunnel (Cloudflare Access in front). demo1 is at
  `/demo1.html` (and the historical `/exhibit/demo1.html`).
- **Build the exhibit**: `cd packages/plggmatic-example && npm run build`
  (plgg-bundle emits the demo bundles under `dist/`).
- **The package gate**: the whole plgg gate (`./scripts/check-all.sh`) builds
  and tests plggmatic + the example against the in-repo siblings. Intra-repo
  deps are `file:../<sibling>`, so a change in `plgg-view` is seen by plggmatic
  without a publish.

## Publishing

plggmatic is published to npm **from this repository** (version 0.2.1 forward;
the 0.2.0 lineage was an interim qfs-viewer-hosted build and is not continued
here). Publishing is a gated release step — a mission ticket that ships a
framework change bumps the patch and the release cuts the publish.

## Experience

plggmatic is a horizontal-orientation UI framework proven against a living
reference (demo1, a contract-management app declared from scratch and drawn as
a multi-column strip). The demanded behavior is observable:

- **The reference is declared, not hand-built.** demo1's whole program is a
  plggmatic DECLARATION (menu, collection, query, action, form) scheduled into
  a plgg-view program; a form/menu the reference uses is driven by a **declared
  framework surface**, not special-cased in the example — a form found in the
  reference is expressible in the framework.
- **Depth does not consume the viewport.** The horizontal strip grows columns
  as the user drills in (measured 2026-07-17: eight columns / 1751px strip at
  420×640) while the body width stays invariant — the reference's central,
  regression-tested DOM claim.
- **It is followable live.** `npm run dev` serves the reference at :51820 with
  hot reload; an edit to the framework or the reference is seen immediately,
  and the live host returns the exhibit at `plggmatic-reference.qmu.dev`.
- **It publishes from this repo.** The npm `plggmatic` is the plgg-lineage
  build (0.2.1+), `repository` = `qmu/plgg`.

## Acceptance

_Self-contained — drivable from this repo alone._

- [ ] The reference (demo1) builds and serves from this repo with hot reload
      (`npm run dev` → 51820), and the live host returns the exhibit (not a 302
      to an Access login for a reader who has passed Access).
- [ ] plgg's guide docs link to the reference (what it is, the live URL, the
      local dev command), so a developer opening plgg reaches it from the docs.
- [ ] A framework capability the reference needs is expressed **generally** in
      plggmatic (not special-cased in the example) — at least one form/menu the
      reference uses is driven by a declared framework surface, with a test. (#20260719022859-forms-demo-driven-by-declared-form-surface.md)
- [ ] The published npm `plggmatic` is the plgg-lineage build (0.2.1+), and its
      `repository` points at `qmu/plgg`.

## Out of scope

- qfs-viewer's own column UI (it implements independently now; its dependency
  removal and any future re-basing on plggmatic are qfs-repo work).
- The qmu.app product vision (on-demand generation) — that stays in the strategy
  plan book; this mission is the framework/reference, not the north star.

## Notes

- Standalone `qmu/plggmatic` (the old home) is being archived; its history stays
  readable there. The engine was absorbed here from the retired `plgg-ui`
  package — plggmatic is the framework, the render engine is its core, not a
  separate package.
- The reference exhibit was measured on 2026-07-17: at 420×640 the horizontal
  strip reaches eight columns / 1751px strip width with the body width invariant
  ("depth does not consume the viewport") — that DOM fact is the reference's
  central claim and a regression target.

## Changelog

<!-- Append-only, dated timeline. -->
- 2026-07-19 — ticket added — 20260719022859-forms-demo-driven-by-declared-form-surface.md
- 2026-07-19 — mission replanned — mission.md
- 2026-07-19 — ticket archived — 20260719022859-forms-demo-driven-by-declared-form-surface.md
