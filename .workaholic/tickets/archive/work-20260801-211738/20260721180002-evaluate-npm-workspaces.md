---
created_at: 2026-07-21T18:00:02+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Changed
depends_on: []
claim: work-20260801-211738
---

# Evaluate (and if viable, adopt) npm workspaces for the monorepo

## Overview

The repo has **no root `package.json`**; all 39 packages cross-link via
`file:../` and install one-by-one through `scripts/npm-install.sh` (39
sequential `npm install`s). This is slow, and the manual `file:` linking causes
gaps — e.g. an empty `packages/plggmatic/node_modules/.bin` left `plgg-bundle`
"command not found" during a fresh integration this session. npm workspaces
(root `package.json` `workspaces: ["packages/*"]`) would resolve once, hoist
shared deps, auto-symlink workspace packages, and use one lockfile. The historic
blocker — plgg-bundle running `.ts` bins under `node_modules` (the `relocate.mjs`
`/tmp` hack) — was **removed** in modernize-plgg-bundle (self-bundled dist bin),
so this is re-evaluable now.

## Key files

- (new) root `package.json` with `workspaces`.
- `scripts/npm-install.sh`, `scripts/build.sh`,
  `scripts/gate-vendor-boundary.sh`.
- `packages/*/package.json` (`file:../` deps).
- `packages/plgg-bundle` — verify its externalization + `file:` dist resolution
  survive hoisting.

## Approach

- Spike a root workspaces `package.json` on a throwaway branch. Verify:
  plgg-bundle self-build + a consumer build still resolve dists; the
  vendor-boundary gate still holds; `check-all` green. **Measure install time
  before/after.**
- If viable, adopt and collapse the 39-way `npm-install.sh` loop to a single
  root install; if not, document the blocker.

## Quality Gate

- **Acceptance:** a documented decision (adopt / not) backed by a working spike —
  install time measured before/after, `check-all` green under workspaces, the
  `file:`/`.bin` linking gaps gone, and **no new dependency**. If adopted,
  `npm-install.sh` simplifies to one root install.

## Policies

- `workaholic:design` / `vendor-neutrality` (no new deps).
- `workaholic:implementation` / `objective-documentation` (decision backed by a
  measured spike, not a preference).

## Final Report

Development completed as planned. The evaluation came out **adopt**, and the
spike IS the adoption: a root `package.json` with `workspaces: ["packages/*"]`,
`scripts/npm-install.sh` collapsed from 39 sequential installs to one, and five
hard-coded install-layout paths corrected. `check-all.sh` green end to end under
it. The decision and its measurements are written up in
`docs/npm-workspaces-decision.md`.

Measured, warm npm cache, same machine: first install **22.40s → 4.60s**,
re-install **0.94s**, disk **1.4G → 403M**, lockfiles **39 → 1**. No new
dependency; nothing was added to any package.json's dependency lists.

### Discovered Insights

- **Insight**: Adopting workspaces broke exactly five things, and all five were
  the same mistake — code that encoded WHERE the installer had put something
  instead of asking for it by name. Four pointed into
  `packages/plgg-bundle/node_modules/typescript`; the fifth was a
  `typeRoots: ["../packages/plgg-bundle/node_modules/@types"]` in
  `scripts/tsconfig.json`. Every fix is a *bare specifier or a default*, and
  every one of them is correct under BOTH layouts — so the repository is not
  now tied to workspaces, it has merely stopped asserting the old shape.
  **Context**: the general rule is that a path into `node_modules` is a
  statement about an install strategy, and install strategies change. `import
  ts from "typescript"` cannot go stale; the path can.

- **Insight**: The `typeRoots` one is the instructive failure. It survived a
  fully green `build.sh` and only surfaced in the gate phase as
  `TS2688: Cannot find type definition file for 'node'`. A pinned `typeRoots`
  silently narrows resolution to one directory instead of falling back, so it
  fails late and with an error that names the type rather than the path.
  **Context**: worth checking first the next time a toolchain move produces a
  confusing "cannot find types" — the setting that overrides a default search
  is more suspect than the default.

- **Insight**: The wall-clock number (4.9× faster) is the *less* important
  half of the result. The disk figure — 1.4G to 403M — is what says what the
  old shape actually was: the same dependencies resolved and materialised once
  per package, 39 times.
  **Context**: and the ticket's motivating bug (an empty
  `plggmatic/node_modules/.bin` leaving `plgg-bundle` "command not found") was
  structural rather than bad luck, because a `file:` link does not install the
  linked package's dependencies. Under workspaces every binary lands once in
  the root `.bin`, so the failure has no way to occur — verified by building
  from inside a package against a root-only install.

- **Insight**: A root `package.json` becomes the nearest manifest for
  `scripts/*.ts`, which now emit `MODULE_TYPELESS_PACKAGE_JSON` warnings.
  Adding `"type": "module"` there would silence them and was deliberately NOT
  done: the root manifest is also the nearest one for every package that
  declares no type, so setting it would change how their files are interpreted
  — a semantic change to quiet a warning.
  **Context**: recorded in the decision doc as an accepted consequence with the
  real fix named (a `"type"` on the packages that lack one, its own ticket).
