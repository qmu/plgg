---
created_at: 2026-07-10T00:29:12+09:00
author: a@qmu.jp
type: refactoring
layer: [UX, Domain, Infrastructure, DB, Config]
effort: 4h
commit_hash: 55773498
category: Changed
depends_on:
mission:
---

# Retire plgg-ui and plgg-domain package boundaries

## Overview

The guide and repository still expose `plgg-ui` and `plgg-domain` as public package leaves even after `plgg-content` and `plgg-mcp` were folded into `plgg-cms`. That is now drift: the product direction is to make `plgg-cms` the CMS surface, not to keep Prag UI, Prag content, and durable-domain pieces discoverable as independent packages.

Retire the standalone `plgg-ui` and `plgg-domain` package boundaries. Move the CMS admin UI runtime and declaration vocabulary into `plgg-cms`; move the `plgg-domain` durable-core source under `plgg-cms` if it is still needed; and move the static theme primitives currently consumed by `plggpress` into `plggpress` so the slim SSG does not depend on CMS. Delete the old package docs, sidebar links, scripts, package locks, container volumes, and package metadata so the live guide cannot link `/packages/plgg-ui` or `/packages/plgg-domain`.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — package removals must leave `packages/`, scripts, workloads, and docs predictable, with no orphaned package directories.
- `workaholic:implementation` / `policies/coding-standards.md` — moved TypeScript must keep the existing strict settings and self-alias conventions, without adding `any`, assertions, or ignored type errors.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — CMS domain and admin logic must remain reusable behind thin HTTP/CLI/MCP entry points without framework-specific types leaking inward.
- `workaholic:implementation` / `policies/anti-corruption-structure.md` — moved domain and UI internals should land inside owner packages along rebuildable, concern-oriented module boundaries.
- `workaholic:implementation` / `policies/command-scripts.md` — `scripts/build.sh`, `scripts/check-all.sh`, `scripts/npm-install.sh`, and guide dependency gates remain the canonical runnable package graph.
- `workaholic:implementation` / `policies/objective-documentation.md` — README and guide content must describe the actual package graph, not the previous public package split.
- `workaholic:design` / `policies/modular-monolith-first.md` — independent package boundaries should exist only when there is a justified owner/consumer split; otherwise consolidate into the modular monolith.
- `workaholic:design` / `policies/sacrificial-architecture.md` — the previous `plgg-ui`/`plgg-domain` split is disposable now that it no longer matches the product boundary.
- `workaholic:operation` / `policies/ci-cd.md` — local gates and live guide/container verification must prove the code and published docs are aligned.

## Key Files

- `packages/plgg-ui/` - standalone UI engine package to retire after relocating its consumed surfaces.
- `packages/plgg-domain/` - standalone durable-domain package to retire or move under `plgg-cms`.
- `packages/plgg-cms/src/Admin/` and `packages/plgg-cms/package.json` - CMS admin consumer and target owner of the admin UI runtime.
- `packages/plggpress/src/theme/` and `packages/plggpress/package.json` - current consumer of `plgg-ui/style`; should own the static guide/theme primitives it uses.
- `packages/guide/site.config.ts`, `packages/guide/packages/plgg-ui.md`, `packages/guide/packages/plgg-domain.md`, and related guide pages - sidebar and content that must stop linking retired packages.
- `README.md` and `packages/guide/contributing/conventions.md` - repository-facing package index and documentation drift record.
- `scripts/build.sh`, `scripts/check-all.sh`, `scripts/npm-install.sh`, `scripts/gate-guide-deps.sh`, `scripts/publish-npm.sh`, `scripts/test-plgg-ui.sh`, `scripts/test-plgg-domain.sh`, and related watch/tsc scripts - package graph wiring to update.
- `workloads/guide/dev-entrypoint.sh` and `workloads/guide/compose.yaml` - live guide container install/volume lists that must not mount retired package node_modules.
- `packages/plgg-bundle/src/domain/usecase/discoverWorkspace.spec.ts` - fixture expectations that may still name `plgg-ui`.

## Related History

Recent history explains how the now-stale boundaries appeared and why this ticket supersedes the earlier conclusion:

- [20260708195655-extract-plggmatic-reusable-seam-to-plgg-family.md](.workaholic/tickets/archive/work-20260706-120449/20260708195655-extract-plggmatic-reusable-seam-to-plgg-family.md) - created `plgg-ui` as a retained shared engine during the plggmatic extraction.
- [20260709000044-repoint-plggpress-onto-plgg-ui.md](.workaholic/tickets/archive/work-20260706-120449/20260709000044-repoint-plggpress-onto-plgg-ui.md) - made `plggpress` consume `plgg-ui/style`, which is the remaining shared dependency to dissolve.
- [20260709211943-consolidate-prag-ui-content-into-prag-cms.md](.workaholic/tickets/archive/work-20260706-120449/20260709211943-consolidate-prag-ui-content-into-prag-cms.md) - folded `plgg-content` and `plgg-mcp` into `plgg-cms` but left `plgg-ui` as a shared package; this ticket changes that product decision.
- [20260707101127-fix-plgg-doc-drift.md](.workaholic/tickets/archive/work-20260706-120449/20260707101127-fix-plgg-doc-drift.md) - established that documentation must be verified against current package exports and implementation.

## Implementation Steps

1. Confirm current package consumers:
   - `plgg-cms` imports the admin runtime from `plgg-ui`.
   - `plggpress` imports `plgg-ui/style` only for static theme primitives.
   - `plgg-domain` is standalone and not currently imported by `plgg-cms`.
2. Move the `plgg-ui` admin runtime surface into `plgg-cms`:
   - Relocate the root runtime trees used by `packages/plgg-cms/src/Admin/*` into a CMS-owned source subtree.
   - Rewrite self-alias imports from `plgg-ui/...` to `plgg-cms/...`.
   - Move the relevant UI specs into the CMS test run.
   - Remove the `plgg-cms` dependency on `plgg-ui`.
3. Move the `plgg-ui/style` surface into `plggpress`:
   - Relocate or copy the style/theme primitives, theme toggle, syntax kinds, and supporting tokens that `packages/plggpress/src/theme/*` imports.
   - Rewrite `plggpress` imports from `plgg-ui/style` to the new local `plggpress` theme support path.
   - Remove the `plggpress` dependency on `plgg-ui`.
4. Retire `plgg-domain` as a standalone package:
   - If the durable-core code is still needed for CMS, relocate it under `packages/plgg-cms/src/` with `plgg-cms` self-alias imports and preserve its tests.
   - If it is unused after discovery, remove the package and docs without leaving live links or scripts that imply it exists.
5. Delete retired package directories and wiring:
   - Remove `packages/plgg-ui/` and `packages/plgg-domain/`.
   - Remove package-specific scripts and watch/typecheck scripts that point at those directories.
   - Update build/install/check/publish ordering, guide dependency gates, guide container installs, compose volumes, package manifests, and package locks.
6. Update documentation and generated guide content:
   - Remove `plgg-ui` and `plgg-domain` sidebar leaves and pages.
   - Update `plgg-cms` and `plggpress` guide pages to describe owned internals rather than independent package dependencies.
   - Update root README and conventions drift notes.
7. Rebuild and verify:
   - Run targeted package tests for `plgg-cms`, `plggpress`, the guide, and scripts touched by the package graph.
   - Run repository gates.
   - Recreate the guide container if it still serves stale sidebar links, then verify the live server path no longer exposes `/packages/plgg-ui` or `/packages/plgg-domain`.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `packages/plgg-ui/` and `packages/plgg-domain/` no longer exist as standalone packages.
- `packages/plgg-cms/package.json`, `packages/plggpress/package.json`, and the guide package lock contain no `plgg-ui` or `plgg-domain` dependency entries.
- `packages/guide/site.config.ts` does not link `/packages/plgg-ui` or `/packages/plgg-domain`.
- Public docs do not link or describe `plgg-ui`, `plgg-domain`, `plgg-content`, `plgg-mcp`, or `plggmatic` as current packages in this repository.
- `plggpress` remains independent from `plgg-cms`; moving `plgg-ui/style` does not make the SSG depend on CMS.
- CMS admin UI tests still exercise the moved declaration/scheduler/rendering runtime.
- Durable-domain tests are preserved under CMS if the source is moved there, or the removal is documented as unused if no code consumes it.
- The guide container install and volume lists contain no retired package node_modules mounts.

**Verification method** — the commands/tests/probes that prove them:

- `rg -n "plgg-ui|plgg-domain|plgg-content|plgg-mcp|plggmatic" README.md packages/guide packages/*/package.json scripts workloads --glob '!**/node_modules/**'` returns only intentional historical notes, if any.
- `./scripts/gate-readme.sh`
- `./scripts/gate-guide-deps.sh`
- `./scripts/gate-vendor-boundary.sh`
- `./scripts/test-plggpress.sh`
- `./scripts/test-plgg-cms.sh`
- `npm run build` in `packages/guide`
- `./scripts/check-all.sh`
- Live/container probe against `http://127.0.0.1:5181` with `Host: plgg-guide.qmu.dev` confirms `/packages/plgg-ui` and `/packages/plgg-domain` are absent from the sidebar and deleted pages do not serve current content.

**Gate** — what must pass before approval:

- The targeted tests and full `./scripts/check-all.sh` are green.
- The guide build is green.
- The source and live guide probes show no current sidebar/package pages for retired packages.
- The final `rg` audit has no current-code or public-doc drift for retired package names.

## Considerations

- The previous archived ticket explicitly kept `plgg-ui` because `plggpress` and the standalone `../plggmatic` repository consumed it. This ticket intentionally supersedes that decision for this repository.
- Do not re-couple `plggpress` to `plgg-cms` to solve the style dependency. The static SSG should own or locally carry the static theme surface it needs.
- If `plgg-domain` is moved into CMS, keep its domain vocabulary separate from HTTP, MCP, auth, and media entry points.
- Public docs should not use hidden pages as a compatibility story. If a package is not current in code, its guide leaf should disappear from the sidebar and package docs.

## Final Report

Retired the standalone `plgg-ui` and `plgg-domain` package boundaries. The former admin UI runtime now lives under `packages/plgg-cms/src/ui/`, the former durable-domain core now lives under `packages/plgg-cms/src/domainCore/`, and the static theme/style subset that `plggpress` needs now lives under `packages/plggpress/src/themeSupport/` so `plggpress` remains independent from CMS.

Removed the old package directories, package docs, sidebar leaves, package scripts, package dependencies, guide container volume/install entries, and stale publish/check/build wiring. Updated README, guide package docs, and conventions notes so current public documentation only exposes `plgg-cms` for the CMS-owned UI/content/MCP/domain internals.

Verification passed:

- `./scripts/gate-readme.sh`
- `./scripts/gate-guide-deps.sh`
- `./scripts/gate-vendor-boundary.sh`
- `./scripts/test-plggpress.sh`
- `./scripts/test-plgg-cms.sh`
- `npm run build` in `packages/guide`
- `./scripts/check-all.sh`
- `git diff --check`
- Retired-name audits for `plgg-ui`, `plgg-domain`, `plgg-content`, `plgg-mcp`, and public-doc `plggmatic` mentions returned no current docs/source/script/container hits.
- Rebuilt the guide container with fresh anonymous volumes; `curl -H 'Host: plgg-guide.qmu.dev' http://127.0.0.1:5181/packages/plgg-domain` and `/packages/plgg-ui` both returned `404 Not Found`, and the live sidebar no longer contains the retired package leaves.
