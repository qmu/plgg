---
created_at: 2026-07-09T21:19:43+09:00
author: a@qmu.jp
type: refactoring
layer: [UX, Domain, Infrastructure, DB, Config]
effort: 4h
commit_hash: 489a9340
category: Changed
depends_on:
mission:
---

# Consolidate Prag UI and Prag content into Prag CMS

## Overview

The repository currently exposes the Prag CMS product surface across three public packages: `plgg-ui` (Prag UI), `plgg-content` (Prag content), and `plgg-cms` (Prag CMS). That split no longer matches the intended product boundary: Prag UI and Prag content should stop being independently discoverable product packages and should be combined into Prag CMS where the admin UI, content API, auth, media, stakeholder, MCP, plugin, ops, and agent surfaces already meet.

This ticket should collapse the package boundary deliberately, without losing the recent `plggpress` split. `plgg-content` is the lower-risk merge because it is already CMS-shaped and consumed by `plgg-cms`; `plgg-ui` needs an explicit boundary decision first because it is still consumed by `plggpress` and the standalone `/home/ec2-user/projects/plggmatic` repository.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — package moves must leave the monorepo layout predictable and remove orphaned package/script/doc paths.
- `workaholic:implementation` / `policies/coding-standards.md` — moved TypeScript must keep the existing no-`any`, no-assertion, typed-boundary style.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — content query logic should remain callable from HTTP, MCP, plugin, and admin surfaces without framework types leaking into domain signatures.
- `workaholic:implementation` / `policies/test.md` — moved package tests must remain green and preserve coverage gates where they exist.
- `workaholic:implementation` / `policies/command-scripts.md` — `scripts/build.sh`, `scripts/check-all.sh`, `scripts/npm-install.sh`, and publish preflight remain the canonical package graph.
- `workaholic:implementation` / `policies/objective-documentation.md` — guide and README documentation must describe the actual post-merge package ownership, not the previous split.
- `workaholic:design` / `policies/modular-monolith-first.md` — the package boundary should consolidate where the independent package boundary is no longer justified.
- `workaholic:design` / `policies/sacrificial-architecture.md` — the previous split is disposable if it no longer reflects the product shape; preserve the reason for the rebuild in this ticket and commit history.
- `workaholic:design` / `policies/vendor-neutrality.md` — keep `plggpress` slim unless there is a deliberate decision to make it depend on the CMS package again.
- `workaholic:operation` / `policies/ci-cd.md` — local gates and publish preflight must prove the derived package order remains valid after package removal.

## Key Files

- `packages/plgg-content/` - current Prag content package to fold into `plgg-cms`.
- `packages/plgg-ui/` - current Prag UI package; merge boundary requires a consumer decision before retirement.
- `packages/plgg-cms/` - target Prag CMS package and runtime entry point.
- `packages/plggpress/package.json` - current direct consumer of `plgg-ui`; must not accidentally regain CMS dependencies.
- `packages/plggmatic` in `/home/ec2-user/projects/plggmatic` - standalone external consumer of published `plgg-ui`.
- `packages/plgg-mcp/package.json` and `packages/plgg-mcp/src/` - current direct consumer of `plgg-content`.
- `scripts/build.sh`, `scripts/check-all.sh`, `scripts/npm-install.sh`, `scripts/publish-npm.sh` - package graph and gate wiring.
- `README.md`, `packages/guide/site.config.ts`, `packages/guide/packages/*.md`, `.workaholic/constraints/architecture.md` - public and internal package documentation that must match the final graph.

## Related History

Recent branch history shows the package boundary has changed several times during the plggmatic extraction and plggpress split:

- [20260709103916-resume-plggmatic-publish-boundary.md](.workaholic/tickets/archive/work-20260706-120449/20260709103916-resume-plggmatic-publish-boundary.md) - proved the extracted plggmatic repo against published packages before deleting the local cluster.
- [20260708195657-remove-plggmatic-cluster-from-monorepo.md](.workaholic/tickets/archive/work-20260706-120449/20260708195657-remove-plggmatic-cluster-from-monorepo.md) - removed `packages/plggmatic`, `packages/plggmatic-example`, and `packages/site` while keeping `plgg-ui`.
- [20260709110456-split-plggpress-ssg-and-plgg-cms.md](.workaholic/tickets/archive/work-20260706-120449/20260709110456-split-plggpress-ssg-and-plgg-cms.md) - split the dynamic CMS surface out of `plggpress`.
- [20260709184509-plgg-bundle-standalone-app-consumer.md](.workaholic/tickets/archive/work-20260706-120449/20260709184509-plgg-bundle-standalone-app-consumer.md) - made standalone app bundling work against published dependency packages.

## Implementation Steps

1. Reconfirm the actual dependency graph from package manifests:
   - `plgg-cms` currently depends on `plgg-ui` and `plgg-content`.
   - `plggpress` currently depends on `plgg-ui` but not `plgg-content` or `plgg-cms`.
   - `plgg-mcp` currently depends on `plgg-content`.
   - `/home/ec2-user/projects/plggmatic` currently consumes published `plgg-ui`.
2. Move `plgg-content` into `plgg-cms` first:
   - Move source into `packages/plgg-cms/src/content/` or `packages/plgg-cms/src/Content/`, following the existing local naming pattern chosen for the package.
   - Move content tests into `packages/plgg-cms`.
   - Rewrite imports from `plgg-content` to local `plgg-cms` paths.
   - Remove `packages/plgg-content` and its package scripts/wiring.
3. Resolve `plgg-mcp` before deleting the `plgg-content` package:
   - Either fold `plgg-mcp` into `plgg-cms`, make it a thin package over exported `plgg-cms` MCP/content functions, or deliberately preserve a smaller shared query-core package.
   - Record the chosen option in the implementation commit and docs.
4. Decide the `plgg-ui` merge boundary before moving code:
   - Option A: move only CMS-specific declarations/admin UI vocabulary into `plgg-cms`, leaving low-level shared UI/theme primitives in `plgg-ui`.
   - Option B: move all UI into `plgg-cms`, copy/move plggpress-required theme/runtime pieces into `plggpress`, and update `/home/ec2-user/projects/plggmatic` to stop consuming `plgg-ui`.
   - Avoid Option C (`plggpress -> plgg-cms`) unless the product decision is that `plggpress` should no longer be a slim independent SSG.
5. Update package metadata and scripts:
   - Remove retired packages from install/build/test/publish wiring.
   - Update dependent `package.json` and lockfiles.
   - Keep `scripts/publish-npm.sh` preflight deriving a valid order.
6. Update documentation to match the final package graph:
   - Root `README.md`.
   - Guide package pages and sidebar.
   - `packages/guide/contributing/conventions.md`.
   - `.workaholic/constraints/architecture.md`.
   - Any package README whose dependency text changes.
7. Run gates and fix all failures before archiving.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- The guide and README no longer present retired independent package boundaries for Prag UI or Prag content after the merge.
- `packages/plgg-content` is either removed or intentionally retained as a smaller shared query-core package with documented ownership.
- `plgg-mcp` has no broken import or package dependency after the content move.
- `plggpress` does not regain direct dynamic CMS dependencies unless the implementation explicitly records that product decision.
- `/home/ec2-user/projects/plggmatic` is still green if the change alters or retires its `plgg-ui` dependency.
- No deleted package remains in `scripts/build.sh`, `scripts/check-all.sh`, `scripts/npm-install.sh`, guide sidebar, root README, package locks, or `.workaholic/constraints/architecture.md`.

**Verification method** — the commands/tests/probes that prove them:

- Run targeted searches for retired package names and old guide paths.
- Run `./scripts/gate-readme.sh`.
- Run `./scripts/gate-guide-deps.sh`.
- Run `./scripts/gate-vendor-boundary.sh`.
- Run `./scripts/test-plgg-cms.sh`.
- Run `./scripts/test-plgg-mcp.sh` if `plgg-mcp` remains independent.
- Run full `./scripts/check-all.sh`.
- Run `PREFLIGHT=1 ./scripts/publish-npm.sh`.
- If `plgg-ui` changes for the standalone repo, run `/home/ec2-user/projects/plggmatic/scripts/check-all.sh`.

**Gate** — what must pass before approval:

- Full monorepo `./scripts/check-all.sh` is green.
- Publish preflight is valid and no retired package appears in the derived publish order.
- The guide build is green and no sidebar/page points at deleted package docs.
- Any impacted standalone `../plggmatic` check is green before retiring or changing `plgg-ui`.

## Considerations

- Do not collapse `plggpress` back into a dynamic CMS package accidentally. The recent split made `plggpress` publishable and installable as a slim SSG.
- `plgg-content` is the natural first merge because its current consumers are CMS/MCP-shaped.
- `plgg-ui` is a separate decision because it is still a public dependency of `plggpress` and the standalone plggmatic repository.
- Documentation drift should be fixed in the same implementation batch as the package graph changes; otherwise the guide will again advertise packages that no longer exist or hide packages that do.

## Final Report

Development completed as planned.

### Discovered Insights

- **Insight**: `plgg-mcp` was only independent because `plgg-content` was independent; once content moved into `plgg-cms`, folding MCP into `plgg-cms/src/mcpProtocol/` avoided a package cycle and kept the HTTP MCP mount and protocol core on one internal boundary.
  **Context**: Future CMS work should add MCP tools through `plgg-cms` unless there is a new non-CMS consumer that justifies a published protocol package.
- **Insight**: `plgg-ui` remains a shared engine, not a standalone Prag CMS product boundary.
  **Context**: `plggpress` and the standalone `../plggmatic` repository still consume the published `plgg-ui` package, so retiring it now would either re-couple plggpress to CMS or force a cross-repo migration unrelated to this ticket.
