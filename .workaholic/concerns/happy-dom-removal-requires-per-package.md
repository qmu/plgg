---
origin_pr: 49
origin_pr_url: https://github.com/qmu/plgg/pull/49
origin_branch: work-20260628-010653
origin_commit: f06fbba
created_at: 2026-06-29T11:27:59+09:00
last_seen: 2026-07-03T02:00:50+09:00
first_seen: 2026-06-29T11:27:59+09:00
concern_id: happy-dom-removal-requires-per-package
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# happy-dom removal requires per-package verification

## Description

The happy-dom removal was scoped to plgg-server only (zero imports, no test pragmas). A naive repo-wide grep gate for "zero happy-dom anywhere" would false-positive on the legitimate happy-dom users in plgg-view, plgg-test, and example (which use it via the `@vitest-environment happy-dom` pragma) (see [2d0297a](https://github.com/qmu/plgg/commit/2d0297a) in `packages/plgg-server/package.json`).

## How to Fix

Any future verification script (CI gate or developer lint) must scope dependency checks per package (e.g. grep `packages/plgg-server/` only for happy-dom absence), never repo-wide. Document this scoping rule in the CI policy.
