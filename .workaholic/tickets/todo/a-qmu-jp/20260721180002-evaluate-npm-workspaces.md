---
created_at: 2026-07-21T18:00:02+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Changed
depends_on: []
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
