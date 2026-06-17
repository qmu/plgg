---
created_at: 2026-06-17T21:40:04+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash: 05513df
category: Changed
depends_on: [20260617213957-guide-scaffold-and-container.md]
---

# Guide T8 — API auto-generation + CI build/deploy

## Overview

Make "cover **all** API" tractable and self-maintaining: auto-generate an
exhaustive API reference from the packages' TSDoc and integrate it into the
VitePress site, then add CI to build the guide and deploy it. The hand-written
guide (T2–T7) is the *curated* path; this ticket guarantees the *complete*
reference stays in sync with the source, so new exports appear without manual
upkeep.

## Key Files

- `packages/guide/` - the VitePress site (from T1) the generated reference plugs
  into; `.vitepress/config.ts` API-section sidebar.
- Every `packages/*/src/index.ts` + TSDoc - the generation input (each package's
  public surface).
- `.github/workflows/` - existing CI (`run-tests.yml`, `prepare-release.yml`,
  `release.yml`); add a guide build/deploy workflow alongside.
- `workloads/development/` - the dev-container precedent; keep the generated-docs
  step runnable in-container too.

## Implementation Steps

1. **Pick the generator** — TypeDoc with a Markdown/VitePress plugin
   (`typedoc-plugin-markdown` + a VitePress preset) is the conventional choice;
   evaluate vs a small custom extractor. Decide one and wire it to read every
   package's `index.ts`.
2. **Generate per-package API pages** into the `API reference` section the T1 IA
   reserved; one sidebar subtree per package, kept comprehensive automatically.
3. **Wire generation into the build** — a `guide` build step that regenerates the
   reference before `vitepress build`; make it work both locally, in the dev
   container, and in CI.
4. **CI build + deploy** — a workflow that builds the guide and publishes it
   (GitHub Pages is the natural target). Keep it independent of the CalVer
   release flow; trigger on changes to `packages/**` + `packages/guide/**` so the
   docs follow the code.
5. **Freshness check** — optionally fail CI if generated pages drift from source
   (regenerate-and-diff), so "all API" coverage cannot silently rot.

## Considerations

- **Dist symlink model.** Packages consume plgg via `file:` dist symlinks and
  there are no workspaces — the generator must run against source `index.ts` (or
  built `.d.ts`) per package; if `.d.ts`, the ordered build from the dev
  Dockerfile is a prerequisite. (`workloads/development/Dockerfile`)
- **CI/CD automation (`standards:operation`).** The deploy must be reproducible
  and vendor-neutral; prefer GitHub Pages via Actions over a third-party docs
  host. Do not couple it to the release pipeline.
- **Curated vs generated split.** T2–T7 own the narrative; this owns the
  exhaustive reference. Keep them clearly separated in the IA so neither
  overwrites the other. ([[20260617213957-guide-scaffold-and-container]])
- Depends only on T1 (the site shell), so it can proceed in parallel with the
  content tickets T2–T7.

## Final Report

Development completed as planned. Chose **TypeDoc** + `typedoc-plugin-markdown`
+ `typedoc-vitepress-theme` (the conventional choice over a custom extractor).
`scripts/gen-api.mjs` runs TypeDoc once per package (own source + own tsconfig,
cross-package types via the built dist symlinks), writes `api/<pkg>/`, and merges
the per-package sidebars into `api/typedoc-sidebar.json`. `.vitepress/config.ts`
loads that merged sidebar when present (graceful fallback for plain `dev`), and
`npm run build` regenerates the reference before `vitepress build`. Added the
`Deploy Guide` GitHub Pages workflow (builds all 9 dists in dependency order,
generates + builds with `DOCS_BASE=/plgg/`, publishes via `actions/deploy-pages`),
triggered on `packages/**` pushes and independent of the CalVer release pipeline.
Verified: full generation produces 0 TypeDoc errors across all 9 packages, and
`vitepress build` (both default and `/plgg/` base) passes clean.

### Discovered Insights

- **Insight**: Per-package TypeDoc generation works against **source** (each
  package's `tsconfig` aliases only its own `plgg<pkg>*`) **provided every
  dependency's `dist` is built** — cross-package imports resolve through the
  `file:` node_modules symlinks to `dist/index.d.ts`. So the generator's hard
  prerequisite is the dependency-ordered dist build, which the deploy workflow
  reproduces (mirroring `workloads/development/Dockerfile`, extended to all 9).
- **Insight**: The freshness guarantee is structural, not a separate drift
  check: `npm run build` always regenerates the reference from source before
  bundling, and the generated `api/<pkg>/` + merged sidebar are gitignored, so
  the deployed docs are byte-derived from the committed source every run — there
  is nothing stale to commit. The optional regenerate-and-diff CI gate was
  therefore omitted as redundant.
- **Insight**: `base` is env-driven (`DOCS_BASE`) so GitHub Pages gets `/plgg/`
  while the local dev container (`workloads/guide`, `vitepress dev`) stays at
  root — `dev` never runs `docs:api`, so the API sidebar is simply absent
  locally unless you run `npm run build`, and the config tolerates that.
