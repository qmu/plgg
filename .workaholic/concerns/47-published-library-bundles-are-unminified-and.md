---
origin_pr: 47
origin_pr_url: https://github.com/qmu/plgg/pull/47
origin_branch: work-20260626-221353
origin_commit: 3adc809
created_at: 2026-06-27T19:52:31+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# Published library bundles are unminified and non-tree-shakeable

## Description

the externalize migration drops minification (no minifier dependency, by design) and the registry-style emit is opaque to downstream tree-shaking, so the npm-published `plgg` artifact is materially larger (~3-4×) for external consumers (see [d77ce03](https://github.com/qmu/plgg/commit/d77ce03) in `packages/plgg-bundle/src/domain/usecase/emitBundle.ts`). Intra-monorepo `file:` consumers are unaffected (they re-bundle).

## How to Fix

track as a publish-time concern — add an optional minify/tree-shake pass for the published `plgg` build only, or accept the size (consumers re-minify). Decide before the next CalVer publish.
