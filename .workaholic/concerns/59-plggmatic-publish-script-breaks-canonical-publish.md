---
type: Concern
origin_pr: 59
origin_pr_url: https://github.com/qmu/plgg/pull/59
origin_branch: work-20260704-015006
origin_commit: 51d2088
created_at: 2026-07-04T12:56:00+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# plggmatic's `publish` npm script breaks the canonical publish-npm.sh flow

## Description

Discovered while shipping PR #59: `packages/plggmatic/package.json` defines a script `"publish": "npm run build && npm publish"`. `publish` is an npm **lifecycle hook** — `npm publish` runs it automatically AFTER the tarball is uploaded — so when `scripts/publish-npm.sh` publishes `plggmatic` from its `.publish-stage/` copy, npm uploads the tarball and then runs the `publish` script, which invokes `plgg-bundle` (its `build`) in the staging copy where no `node_modules/.bin/plgg-bundle` exists → exit 127. It also implies a recursive `npm publish`. The tarball still uploads (the hook fires post-upload), so `plggmatic@0.1.0` reached the registry, but `publish-npm.sh` exits non-zero and aborts, printing a scary error and skipping the per-package verification for plggmatic.

## How to Fix

Remove the `publish` script from `packages/plggmatic/package.json` (building on publish is already handled: publish-npm.sh builds dists via `build.sh` before staging, and other packages have no build-on-publish hook). If a build-before-pack step is genuinely wanted, use `prepack` (runs in the package dir with its own node_modules during local dev), never a `publish` hook that recurses. Then re-run `./scripts/publish-npm.sh` — it will re-verify plggmatic (publish-if-newer makes the already-uploaded 0.1.0 a safe skip) and exit clean.
