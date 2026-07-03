---
created_at: 2026-07-03T15:30:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Config]
effort: 4h
commit_hash:
category: Added
depends_on:
---

# Per-package npm publishing from this server: one canonical `scripts/publish-npm.sh` under the Local CI/CD Execution policy

## Overview

Publish the plgg family to npm per-package, from this host, script-driven — no hosted CI in the publish path. Today the entire publish axis is `scripts/publish-plgg.sh`, a 7-line wrapper that publishes **only** `packages/plgg` (registry now stale at 0.0.25 vs local 0.0.27), while 16 packages carry scattered per-package `npm run publish` scripts. Two publishing hazards dominate (verified): every cross-package dependency is a `file:../X` specifier that would publish **unresolvable**, and **no package has a `files` field** — `npm pack --dry-run` in packages/plgg stages **631 files** (all of coverage/, src/, tsconfig, bundle.config.ts) because the root `.gitignore` does not apply to npm packing. Note `dist/` is **gitignored, not committed**: publishing depends on a fresh build having run, and the `files: ["dist"]` allowlist is also what guarantees the gitignored dist ships.

One canonical runner (`scripts/publish-npm.sh`, absorbing `publish-plgg.sh`) fixes all of it: gate on fresh `check-all.sh`, walk `build.sh`'s dependency topology, rewrite `file:` deps to real ranges in a staging copy (never the working tree), publish-if-newer idempotency, and an online-verification bracket per package. Plus a `.workaholic/deployments/npm.md` contract so `/ship` gains npm as a confirmed deployment target beside `guide.md` and `release.md`.

**Decisions recorded as recommended defaults** (the interrogation prompt timed out; the developer explicitly asked to "npm deploy by each packages from this server" and completed `npm login` — override any of these at the `/drive` gate):

1. **First real publish happens during `/drive`** of this ticket; the acceptance gate is the verification bracket passing per package. `/ship`'s npm contract covers subsequent releases.
2. **Package set**: all non-private packages — 16 libraries + `plgg-bundle` (a plggpress consumer's dev workflow runs `plgg-bundle dev`, guide-style). `example` and `guide` are `private: true` and skipped by flag, not by name-list.
3. **Names**: keep unscoped `plgg-*`/`plggmatic`/`plggpress` (all verified free on the registry; `plgg` already published unscoped by this account). **Versioning**: independent per-package semver with publish-if-newer — this resolves the standing deferred concerns `41-version-bump-covers-only-plgg-and.md` / `46-carried-from-pr-41-version-bump.md`.
4. **plgg publishes 0.0.27 as-is** (0.0.26/0.0.27 are just unpublished history).

Credentials: `npm login` already done on this host (`npm whoami` = tamurayoshiya); the runner reads ambient `~/.npmrc` auth — token never appears in the repo, the script, or the deployment contract. No `--provenance` (it requires hosted-CI OIDC; deliberately declined per the local-first stance, same trade-off `release.md` makes).

## Policies

- `workaholic:operation` / `policies/ci-cd.md` — the governing policy end-to-end: consolidate releases into repository scripts run from `/ship`; pre-release inspections green in production config (`check-all.sh`); post-release online verification against the production origin (for npm, the registry IS production: `npm view` + scratch install); credentials at runtime only; thin hosted-CI dependence (no Actions publisher, no provenance).
- `workaholic:implementation` / `policies/command-scripts.md` — one canonical runner; publish logic must not stay scattered across 16 per-package npm scripts, and the topology must not be re-encoded (the deploy-guide.yml PR #51 drift incident is the cautionary precedent).
- `workaholic:implementation` / `policies/coding-standards.md` + `policies/directory-structure.md` — house sh style (`#!/bin/sh -eu`, `REPO_ROOT=$(git rev-parse --show-toplevel)`, per-package cd loop, success banner); tarball contents are published structure — dist-only surfaces for pure libraries.
- `workaholic:design` / `policies/vendor-neutrality.md` — zero new dependencies: npm + node + existing scripts only; no changesets/lerna/semantic-release/np.

## Key Files

- `scripts/publish-plgg.sh` — the runner to absorb (delete after `publish-npm.sh` supersedes it; sweep `menu.sh` if it lists it)
- `scripts/build.sh` — owns the 18-line dependency topology; the publish order must reuse/derive it, never fork a second copy
- `scripts/check-all.sh` — the pre-publish gate (runs `build.sh` internally, so a green gate guarantees fresh dists exist)
- `packages/*/package.json` — add per-package `files` allowlists: `["dist"]` for the ~11 pure libraries; `["dist","bin"]` for plgg-db-migration (bin runs from dist); `["dist","src","bin"]` for plggpress, plgg-test, and plgg-bundle (**bins run from src**, verified in the launchers); preserve plgg-highlight's `typescript` peerDependency and plgg-test/plgg-bundle's `typescript` hard dependency through the rewrite
- `.workaholic/deployments/npm.md` (new) + `.workaholic/deployments/index.md` — the deployment contract in release.md's shape (frontmatter: `confirmation_method: api-probe`, url https://www.npmjs.com/~tamurayoshiya or per-package; Procedure = the runner from /ship post-merge; Confirmation = `npm view` + scratch install), linked from the index
- `.workaholic/concerns/41-version-bump-covers-only-plgg-and.md`, `46-carried-from-pr-41-version-bump.md` — resolved by decision 3; cite in the commit so the next /report's judge archives them

## Related History

- [20260703050355-minimum-github-actions-local-cicd-policy.md](.workaholic/tickets/archive/work-20260703-050355/20260703050355-minimum-github-actions-local-cicd-policy.md) — the governing precedent on this branch: script-driven releases from /ship, the deployment-contract pattern, publish-release.sh's `already_exists` idempotency shape
- [20260703020138-deploy-guide-build-plggmatic-before-plggpress.md](.workaholic/tickets/archive/work-20260703-020116/20260703020138-deploy-guide-build-plggmatic-before-plggpress.md) — the topology-drift incident: a hand-copied build order went stale; the publish runner must not create a third copy of the topology
- [20260529190705-rename-sh-to-scripts-and-src-to-packages.md](.workaholic/tickets/archive/work-20260528-143038/20260529190705-rename-sh-to-scripts-and-src-to-packages.md) — publish-plgg.sh's only prior touch (relocation); absorbing it is clean supersession

## Implementation Steps

1. **`files` allowlists**: add the per-package `files` field per the three classes above. Verify each with `npm pack --dry-run --json` — the staged list must be exactly the allowlist (+ package.json/README, which npm always includes).
2. **`scripts/publish-npm.sh`** (house sh style, absorbing publish-plgg.sh):
   a. Gate: run `./scripts/check-all.sh` fresh; abort on red.
   b. Walk the build.sh package order (derive it — e.g. parse build.sh's `cd .../packages/X` lines — or a single shared order file both source; do not fork a copy). Skip `"private": true` packages.
   c. Per package: read local version; `npm view <name> version` (E404 = never published); **skip unless local > registry** (idempotent re-runs are all-skip no-ops).
   d. Stage: copy the package (dist, bin/src per its allowlist, package.json, README) into a scratch staging dir; rewrite every `file:../X` in dependencies/devDependencies to `^<X's local version>`; preserve peerDependencies untouched. Never mutate the working tree (atomic-publish lesson: torn trees were the bundler-flake root cause).
   e. Assert no `file:` specifier survives in the staged manifest, then `npm publish` from the staging dir.
   f. **Verification bracket**: poll `npm view <name>@<version>` until it resolves; then in a scratch consumer dir, `npm install <name>@<version>` and run an import smoke test (`node -e "import('<name>')"` for ESM / require for dual-format; `--help` for bin packages — this also proves plggpress/plgg-test bins work from a real npm install, since their launchers run from src through a loader hook: if the hook needs plgg-bundle at runtime, promote it to a real dependency and re-publish).
3. **Delete `scripts/publish-plgg.sh`**; repoint or remove the now-superseded per-package `publish` npm scripts (runner is the single entry).
4. **`.workaholic/deployments/npm.md`** + index link, release.md's shape; deploy model: post-merge from /ship, deploy-from-branch acceptable for the first publish per decision 1.
5. **Run the first real publish** (decision 1) and record the bracket evidence per package.
6. Gates: `check-all.sh` green (unchanged code paths — the files field and script are additive), commit citing the two versioning concerns as resolved.

## Considerations

- **plggpress/plgg-test/plgg-bundle bins run from src** — the scratch-install smoke test (2f) is the arbiter of whether their runtime loader deps are correctly declared; expect to promote a dev dep to a real dep if the bin fails outside the monorepo. This is the highest-risk unknown in the ticket.
- plggmatic/plggpress are ESM-only (import-only exports, no require condition) — a known standing concern (`51-plggpress-exports-map-is-import-only.md`); publishing does not fix it, the smoke test just must use `import()`, not `require()`, for those two.
- Unminified bundles are an accepted vendor-neutrality decision (concerns 47/51) — not a publish blocker.
- npm-install.sh/check-all.sh must have run on this host before publishing (dist is gitignored; nothing to pack without a build).
- The pending PR #53 ship is untouched by this ticket; drive this before completing that ship so the npm capability rides the same branch, or after — either works, the runner is main-agnostic.

## Quality Gate

**Acceptance criteria** (recorded defaults; confirm at the /drive gate): (1) every non-private package where local version > registry version is published, and for each the bracket passes — `npm view <name>@<version>` resolves AND the scratch-dir install + import/bin smoke test succeeds; (2) `npm pack --dry-run` per package stages exactly the allowlist (the 631-file plgg regression is dead); (3) no `file:` specifier in any published manifest (asserted by the script); (4) re-running `publish-npm.sh` immediately after is an all-skip no-op; (5) `git status` clean after a run (working tree never mutated); (6) fresh `check-all.sh` green; (7) `.workaholic/deployments/npm.md` exists, linked from the deployments index. **Gate**: /drive approval on the evidence table (package → version → view-resolves → smoke-test result), plus the standard commit/archive chain.
