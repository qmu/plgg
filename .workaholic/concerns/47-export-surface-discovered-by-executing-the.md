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

# Export surface discovered by executing the built bundle

## Description

`plgg-bundle` discovers a package's ESM export names by executing its freshly-built CJS bundle in `node:vm` (`packages/plgg-bundle/src/vendors/runner.ts`); under the externalize contract this reads sibling dists at build time, which is what produced the shared-dist torn-read flake (fixed by atomic publish, but the execute-to-discover coupling remains). See [d77ce03](https://github.com/qmu/plgg/commit/d77ce03).

## How to Fix

derive the export surface statically from the entry's emitted `.d.ts` / parsed module graph instead of executing the bundle, removing build-time runtime resolution entirely (DEPENDENCY-LOG gap #2).
