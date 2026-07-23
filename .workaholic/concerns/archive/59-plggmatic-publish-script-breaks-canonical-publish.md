---
type: Concern
origin_pr: 59
origin_pr_url: https://github.com/qmu/plgg/pull/59
origin_branch: work-20260704-015006
origin_commit: 51d2088
created_at: 2026-07-04T12:56:00+09:00
last_seen: 2026-07-04T12:56:00+09:00
first_seen: 2026-07-04T12:56:00+09:00
concern_id: plggmatic-s-publish-npm-script-breaks
severity: moderate
status: resolved
resolved_by_pr: 
resolved_by_commit: 
resolved_by_branch: work-20260704-130317
---

# plggmatic's `publish` npm script breaks the canonical publish-npm.sh flow

## Description

Discovered while shipping PR #59: `packages/plggmatic/package.json` defines a script `"publish": "npm run build && npm publish"`. `publish` is an npm **lifecycle hook** — `npm publish` runs it automatically AFTER the tarball is uploaded — so when `scripts/publish-npm.sh` publishes `plggmatic` from its `.publish-stage/` copy, npm uploads the tarball and then runs the `publish` script, which invokes `plgg-bundle` (its `build`) in the staging copy where no `node_modules/.bin/plgg-bundle` exists → exit 127. It also implies a recursive `npm publish`. The tarball still uploads (the hook fires post-upload), so `plggmatic@0.1.0` reached the registry, but `publish-npm.sh` exits non-zero and aborts, printing a scary error and skipping the per-package verification for plggmatic.

## How to Fix

Remove the `publish` script from `packages/plggmatic/package.json` (building on publish is already handled: publish-npm.sh builds dists via `build.sh` before staging, and other packages have no build-on-publish hook). If a build-before-pack step is genuinely wanted, use `prepack` (runs in the package dir with its own node_modules during local dev), never a `publish` hook that recurses. Then re-run `./scripts/publish-npm.sh` — it will re-verify plggmatic (publish-if-newer makes the already-uploaded 0.1.0 a safe skip) and exit clean.

## Resolution

Fixed two-part on branch `work-20260704-130317`:

1. **Hardened the publisher** — `scripts/publish-npm.sh` now passes `--ignore-scripts` to the staged `npm publish`. The dist is already built by `build.sh` before staging, so no package needs a publish-time lifecycle hook; this immunizes the whole family-publish flow against any staged package's stray `prepublishOnly`/`prepare`/`prepack`/`publish`/`postpublish` script, not just plggmatic's.
2. **Removed the errant script** — deleted the `"publish": "npm run build && npm publish"` entry from `packages/plggmatic/package.json`. A monorepo-wide scan confirms no `package.json` under `packages/` now defines any `publish`/`prepublish`/`prepublishOnly`/`prepare`/`prepack` lifecycle script.
