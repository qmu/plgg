---
created_at: 2026-07-09T11:04:56+09:00
author: a@qmu.jp
type: refactoring
layer: [Config, Infrastructure]
effort:
commit_hash: a1336d08
category: Changed
depends_on:
mission:
---

# Split `plggpress` into a slim SSG package + a new `plgg-cms` dynamic-content package

## Overview

`packages/plggpress` has grown two concerns into one package: a
**static site generator** (the `plggpress build`/`dev` surface the
guide and the plggmatic `site` consume) and a **dynamic
content/server CMS** (admin UI, content API, auth/OIDC, editing,
media, ops, MCP tools, agent surfaces). Because they share one
`package.json`, the SSG surface transitively drags in
`plgg-content`, `plgg-sql`, `plgg-auth`, and `plgg-mcp` — so any
consumer of the SSG (the extracted plggmatic `site`) would be forced
to install/publish CMS/server packages it never uses.

This ticket splits the package along the concern boundary:

- **`plggpress` (slim, SSG)** — keeps `SiteConfig`, `ContentModel`,
  `Config`, `Href`, `Press`, `theme`, `CheckLinks`, `router`,
  `framework` (incl. the **generic** `framework/Serve/serveApp`
  mount-seam), `build.ts`, `devEntry.ts`, and the `build` half of
  `cli.ts`. Deps become only `plgg`, `plgg-view`, `plgg-md`,
  `plgg-highlight`, `plgg-cli`, `plgg-kit`, `plgg-ui`, `plgg-server`,
  `plgg-http` (the last two only for the dev-preview/serve engine).
  **Drops** `plgg-content`, `plgg-sql`, `plgg-auth`, `plgg-mcp`.
- **`plgg-cms` (new, dynamic)** — takes `Admin`, `api`, `auth`,
  `editing`, `media`, `ops`, `plugin`, `server`, `stakeholder`,
  `mcp`, `agent`, the `contentApi` barrel export (currently
  `plggpress/src/index.ts:67`), the `serve` subcommand of `cli.ts`
  (which wires `pressServeWebWithAuth`), and the CMS-wiring
  `framework/Serve/usecase/serveApp.spec.ts`. Depends on the slim
  `plggpress` plus `plgg-content`, `plgg-sql`, `plgg-auth`,
  `plgg-mcp`, `plgg-server`.

The seam is already clean at the production level: `serveApp` is a
generic node:http serve engine that both the SSG dev-preview and the
CMS `serve` mount a handler into via the existing
`pressServeWebWithAuth` mount-seam — so there are **no production
reverse edges** from the SSG side into the CMS side. Only a test
fixture (`serveApp.spec.ts`) and the `cli.ts` `serve` branch cross
today, and both move to `plgg-cms`.

**Why now / why a second package (required by policy).** This is the
prerequisite that lets slim `plggpress` publish to npm with **no CMS
deps**, so the plggmatic-extraction-cut trip's `site` package can
pin to published `plggpress` across the repo boundary **without**
force-publishing `plgg-content`/`plgg-mcp`/`plgg-domain`. Per
`modular-monolith-first`, the split is drawn by concern (SSG core vs
disposable dynamic surface) and both packages stay in this monorepo
— an internal modular split, not a service split. It realizes
roadmap **D5** (public reader stays SSG/CDN; dynamic admin/API/RAG/
agent run as a separate served instance) at the package level.

## Policies

- `workaholic:design` / `policies/modular-monolith-first.md` — **governing**: a package-boundary split by concern; both stay in-repo (lower bar than a service split) but the boundary rationale must be recorded here.
- `workaholic:design` / `policies/sacrificial-architecture.md` — SSG core (durable) vs dynamic CMS surface (disposable/rebuildable); boundaries align to rebuildable units.
- `workaholic:design` / `policies/vendor-neutrality.md` — zero new external deps (a code move, not a feature); dependency direction is one-way (slim plggpress must **not** depend on plgg-cms).
- `workaholic:implementation` / `policies/directory-structure.md` — `plgg-cms` lands as `packages/plgg-cms/` with `src/`, a root `src/index.ts` barrel, its own `README.md`.
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`ts-ignore`; Prettier printWidth 50; no hand-packing.
- `workaholic:implementation` / `policies/type-driven-design.md` — the moved `Theme`/`ContentModel`/config contracts stay fully typed (Option/Result/brand) across the new boundary; no widening at the seam.
- `workaholic:implementation` / `policies/test.md` — every moved spec stays green; coverage stays > 90% (statements/branches/functions/lines) in **both** packages.
- `workaholic:implementation` / `policies/command-scripts.md` — add canonical `scripts/test-plgg-cms.sh`; `check-all.sh` stays the single gate and invokes the new package.
- `workaholic:operation` / `policies/ci-cd.md` — `check-all.sh` is the one reproducible gate and must pass on a **fresh** rebuild with `plgg-cms` added; publish order stays topologically valid; slim `plggpress` publishes standalone with no CMS/server deps.

## Trip Origin

Prerequisite surfaced during `/drive` of the plggmatic-extraction-cut
trip's ticket B (`20260708195656`) and recorded in the resume ticket
`20260709103916-resume-plggmatic-publish-boundary.md` (Step 2 /
Decisions): "split a small published SSG package from local
plggpress so the extracted docs site does not need `plgg-content`,
`plgg-mcp`, `plgg-domain`." This ticket is the concrete
implementation of that option and is a **prerequisite** of the
resume ticket and ticket C.

## Key Files

- `packages/plggpress/src/` — the package to split. SSG-kept:
  `SiteConfig/`, `ContentModel/`, `Config/`, `Href/`, `Press/`,
  `theme/`, `CheckLinks/`, `router/`, `framework/`, `build.ts`,
  `devEntry.ts`. CMS-moved: `Admin/`, `api/`, `auth/`, `editing/`,
  `media/`, `ops/`, `plugin/`, `server/`, `stakeholder/`, `mcp/`,
  `agent/`.
- `packages/plggpress/src/index.ts` — barrel; relocate the
  `contentApi` export (line 67) to plgg-cms's barrel (nothing
  outside plggpress imports it, so removal is safe).
- `packages/plggpress/src/cli.ts` — **split**: `build` stays
  (`buildSpecOf`/SSG); the `serve` subcommand (`pressServeWebWithAuth`
  from `plggpress/server/pressServer`) moves to plgg-cms.
- `packages/plggpress/src/framework/Serve/usecase/serveApp.ts` —
  **stays** in slim plggpress (generic serve engine); only its
  CMS-wiring `serveApp.spec.ts` moves to plgg-cms.
- `packages/plggpress/bin/plggpress.mjs` — SSG `build` launcher
  stays; a new `packages/plgg-cms/bin/plgg-cms.mjs` ships the
  `serve` CLI.
- `packages/plggpress/package.json` — remove `plgg-content`,
  `plgg-sql`, `plgg-auth`, `plgg-mcp` from `dependencies`.
- `packages/plgg-cms/` (NEW) — scaffold from a sibling
  (`packages/plgg-content` shape): `package.json` (files:["dist"],
  dual `import`/`require` exports map, standard scripts block,
  `qmu`/MIT), `tsconfig.json`, `.prettierrc.json`, `README.md`,
  `src/index.ts` barrel. Deps: `plggpress` (`file:../plggpress`) +
  `plgg-content`/`plgg-sql`/`plgg-auth`/`plgg-mcp`/`plgg-server`.
- `scripts/build.sh` — add a `cd $REPO_ROOT/packages/plgg-cms &&
  npm run build` cd-line **after** plggpress (this is the sed
  source-of-truth that feeds publish order + gate-guide-deps).
- `scripts/check-all.sh` — add a `./scripts/test-plgg-cms.sh`
  invocation (near the existing `test-plggpress.sh` line ~49).
- `scripts/test-plgg-cms.sh` (NEW) — clone `scripts/test-plggpress.sh`.
- `scripts/gate-guide-deps.sh` / `workloads/guide/dev-entrypoint.sh`
  / `workloads/guide/compose.yaml` — the guide consumes only the SSG
  side; after slimming, plggpress no longer pulls CMS deps, so the
  guide install/volume lists must reconcile (gate-guide-deps reads
  plggpress's dep block). `plgg-cms` is **not** a guide runtime dep.
- `README.md` — keep the `plggpress` index entry (now SSG-only
  wording); add a `plgg-cms` index entry + section (gate-readme:
  root-link + back-link).
- `.workaholic/constraints/architecture.md` — add a `plgg-cms` row
  (node:http-serving → EXEMPT, same basis as the plggpress row);
  update the plgg-ui/plggmatic rows whose "consumed by plggpress
  (Admin …)" note now points at plgg-cms.

## Related History

- [20260709000044-repoint-plggpress-onto-plgg-ui.md](.workaholic/tickets/archive/work-20260706-120449/20260709000044-repoint-plggpress-onto-plgg-ui.md) — A2 established the plggpress framework/theme seam this split subdivides.
- [20260708195655-extract-plggmatic-reusable-seam-to-plgg-family.md](.workaholic/tickets/archive/work-20260706-120449/20260708195655-extract-plggmatic-reusable-seam-to-plgg-family.md) — A1 scaffolded plgg-ui; the SSG surface plggpress keeps builds on plgg-ui.
- [20260703235711-absorb-plggmatic-into-plggpress.md](.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md) — the earlier package-boundary precedent.

## Implementation Steps

1. **Scaffold `packages/plgg-cms/`** from the `packages/plgg-content`
   shape: `package.json` (name `plgg-cms`, version `0.0.1`,
   `files:["dist"]`, dual exports map, standard scripts block,
   `qmu`/MIT/repository), `tsconfig.json`, `.prettierrc.json`
   (printWidth 50), `README.md`, empty `src/index.ts`. Set deps to
   `plggpress` (`file:../plggpress`) + `plgg-content`/`plgg-sql`/
   `plgg-auth`/`plgg-mcp`/`plgg-server` + the standard devDeps
   (`@types/node`, `plgg-bundle`, `plgg-test`, `typescript`). Add
   `bin/plgg-cms.mjs` + a `bin` entry for the `serve` CLI.
2. **Move the CMS subtrees** `Admin/`, `api/`, `auth/`, `editing/`,
   `media/`, `ops/`, `plugin/`, `server/`, `stakeholder/`, `mcp/`,
   `agent/` (with their co-located `*.spec.ts`) into
   `packages/plgg-cms/src/`, plus `serveApp.spec.ts`. Rewrite their
   intra-package imports from `plggpress/<dir>/…` to the plgg-cms
   barrel/relative paths, and imports of the SSG-kept surface to
   `plggpress` / `plggpress/<subpath>`.
3. **Split `cli.ts`**: keep the `build` command in
   `packages/plggpress/src/cli.ts` (drop the `serve`
   branch + the `pressServeWebWithAuth` import). Create the
   `serve` CLI in `packages/plgg-cms` (its own `cli.ts` + bin),
   importing the generic `serveApp` from `plggpress` and mounting
   the CMS handler.
4. **Relocate the barrel leak**: remove `export { contentApi } from
   "plggpress/api/contentApi"` from `plggpress/src/index.ts`; export
   `contentApi` (and the rest of the CMS public surface) from
   `packages/plgg-cms/src/index.ts`.
5. **Slim `packages/plggpress/package.json`**: remove `plgg-content`,
   `plgg-sql`, `plgg-auth`, `plgg-mcp` from `dependencies`. Confirm
   the remaining SSG code compiles without them.
6. **Wire scripts**: add the plgg-cms `cd`-line to `scripts/build.sh`
   after plggpress; add `./scripts/test-plgg-cms.sh` to
   `check-all.sh`; create `scripts/test-plgg-cms.sh` from
   `test-plggpress.sh`. Confirm `publish-npm.sh`'s sed-derived order
   picks up plgg-cms topologically after plggpress.
7. **Reconcile guide + docs**: update `gate-guide-deps.sh`'s
   expectations / the guide container lists so the slimmed plggpress
   dep set reconciles (plgg-cms is not a guide dep); add the
   `plgg-cms` README index entry + section (gate-readme); add the
   `plgg-cms` row to `.workaholic/constraints/architecture.md` and
   fix the plgg-ui/plggmatic "consumed by … Admin" notes.
8. **Verify**: run `scripts/check-all.sh` **fresh** (green with
   plgg-cms, incl. gate-guide-deps + gate-readme, every `test-*.sh`),
   run the publish-order dry-run, and grep-assert the dep direction
   and the absence of CMS deps in slim plggpress.

## Quality Gate

**Acceptance criteria:**

- `packages/plgg-cms/` exists with the standard layout
  (`src/index.ts` barrel, `package.json`, `tsconfig.json`,
  `.prettierrc.json`, `README.md`) and builds.
- `packages/plggpress/package.json` `dependencies` no longer list
  `plgg-content`, `plgg-sql`, `plgg-auth`, or `plgg-mcp`.
- The CMS subdirs (`Admin`, `api`, `auth`, `editing`, `media`,
  `ops`, `plugin`, `server`, `stakeholder`, `mcp`, `agent`), the
  `serve` CLI, and `serveApp.spec.ts` live under
  `packages/plgg-cms/`; `serveApp.ts` (generic engine) stays in
  `plggpress`.
- Dependency direction is one-way: `plgg-cms` depends on `plggpress`;
  `plggpress` does **not** depend on `plgg-cms`.
- No new external dependency is introduced by the split.
- No `as`, `any`, `@ts-ignore`, `@ts-expect-error`, or non-null `!`
  in moved/new code; Prettier printWidth 50 across both packages.
- `README.md` lists both `plggpress` (SSG wording) and `plgg-cms`;
  `.workaholic/constraints/architecture.md` has a `plgg-cms` row and
  updated plgg-ui/plggmatic notes.

**Verification method:**

- `scripts/check-all.sh` green on a **fresh** rebuild (all gates
  incl. `gate-guide-deps.sh` + `gate-readme.sh`, build, every
  remaining/new `test-*.sh` incl. `test-plggpress.sh` and
  `test-plgg-cms.sh`), with coverage > 90% (statements/branches/
  functions/lines) in both `plggpress` and `plgg-cms`.
- `grep -n '"plgg-content"\|"plgg-sql"\|"plgg-auth"\|"plgg-mcp"'
  packages/plggpress/package.json` returns nothing under
  `dependencies`.
- `grep -rn 'from "plgg-cms' packages/plggpress/src` returns nothing
  (no reverse edge).
- `grep -rn 'from "plggpress' packages/plgg-cms/src` resolves only to
  the SSG-kept surface (no `plggpress/api|Admin|editing|server|auth|
  mcp|media|ops|stakeholder|agent`).
- `scripts/publish-npm.sh` order-check/dry-run produces a valid order
  with `plgg-cms` after `plggpress`.
- `guide` and `site` still build via the slimmed `plggpress` (their
  SSG imports `defineSite`/`SidebarItemInput`/`pressDevEntry` resolve
  unchanged).

**Gate:**

- `scripts/check-all.sh` green **fresh** WITH `plgg-cms` AND slim
  `plggpress` carrying no CMS deps AND one-way dep direction AND
  coverage > 90% in both packages AND no escape hatches AND the
  grep/order checks clean.

## Considerations

- **Prerequisite of the plggmatic extraction**: after this lands, the
  resume ticket (`20260709103916`) proceeds with `site` pinned to
  **published slim `plggpress`**, and ticket C removes the cluster.
  Update those tickets' `depends_on`/boundary notes when driving them.
- **Coverage tail (known gotcha)**: moving CMS code into a new package
  means `plgg-cms` must independently clear the > 90% gate. Thin
  integration-composition files (e.g. `serve`/`authWeb`/`bootstrapAuth`
  composition, `cli.ts`) may need the same coverage-exclusion the
  monorepo already applies to `cli.ts`-like files — mirror the
  existing pattern rather than inventing new tests for pure wiring.
- **`serveApp` stays generic**: do not move `serveApp.ts` — the dev
  preview (SSG) also serves through it; only the CMS-wiring spec and
  the `serve` command move. Keep the `pressServeWebWithAuth`
  mount-seam as the inversion point.
- **build.sh is the single source of truth** for publish order +
  guide provisioning (sed-derived); add the `plgg-cms` cd-line there
  and let the derived lists follow — never hand-fork them.
- **Fresh check-all only**: stale dists mask type drift across the new
  boundary; rebuild from clean before judging green.
