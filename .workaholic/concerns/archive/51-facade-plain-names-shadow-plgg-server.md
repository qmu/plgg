---
origin_pr: 51
origin_pr_url: https://github.com/qmu/plgg/pull/51
origin_branch: work-20260701-185044
origin_commit: efd21c0
created_at: 2026-07-03T02:00:50+09:00
severity: low
status: resolved
resolved_by_pr: 540d2f36
resolved_by_commit: 
---

# Facade plain names shadow plgg-server and plgg-md variants

## Description

plggmatic's root barrel resolves the 9 cross-library ambiguous names (head, header, on, link, strong, table, text$, ListItem, TableRow) to their plgg-view variants; plgg-server's HEAD-route `head`, context `header`, route-matcher `on` and plgg-md's AST constructors are only reachable from their own packages, and a facade-only consumer cannot import them (see [784bf14](https://github.com/qmu/plgg/commit/784bf14) in `packages/plggmatic/src/index.ts`)

## How to Fix

If a facade consumer ever needs the shadowed variants, add namespaced subpath mirrors (e.g. plggmatic/routing, plggmatic/md) rather than renamed aliases; re-run the TS-compiler-API symbol-identity probe whenever a mid-library barrel changes, since star-export ambiguity drops names silently
