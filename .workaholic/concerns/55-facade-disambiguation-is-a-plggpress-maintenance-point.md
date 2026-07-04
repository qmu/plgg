---
type: Concern
origin_pr: 55
origin_pr_url: https://github.com/qmu/plgg/pull/55
origin_branch: work-20260703-184443
origin_commit: 31fdee9
created_at: 2026-07-04T02:12:32+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# Facade disambiguation is a new plggpress maintenance point

## Description

Absorbing `plggmatic` into `plggpress/src/framework/` moved its re-export facade in-repo, where plggpress loads it as **source** (via the `plggpress/framework` self-alias) rather than as a pre-bundled dist. Native ESM rejects a barrel with ambiguous star exports, so any symbol exported by more than one wrapped package (`plgg-view`, `plgg-server`, `plgg-md`, `plgg-highlight`) must be explicitly disambiguated. This branch dropped the redundant `export * from "plgg-http"` (plgg-server already re-exports all of it) and added explicit `renderToString` / `collectCss` re-exports from plgg-view, alongside the pre-existing `head` / `header` / `on` / plgg-md AST disambiguations. Adding a new stack symbol whose name collides across those packages will silently break the facade until it is disambiguated in `packages/plggpress/src/framework/index.ts`. (see [31fdee9](https://github.com/qmu/plgg/commit/31fdee9))

## How to Fix

Contained, not eliminated: because the barrel is loaded as source, a new collision fails loudly at test time (`conflicting star exports for name 'X'`), pointing straight at the fix — add the intended variant to the explicit `from "plgg-view"` (or appropriate origin) re-export block. If the disambiguation list grows unwieldy, reconsider replacing the whole-stack `export *` facade with direct per-package imports at plggpress's call sites (the collision-prone names are `head`/`header`/`link`, which the facade currently resolves for callers).
