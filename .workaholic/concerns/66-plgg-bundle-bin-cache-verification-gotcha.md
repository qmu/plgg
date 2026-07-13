---
type: Concern
mission: 
tickets: [20260712014000-plgg-bundle-flattens-nested-bundles-with-colliding-module-keys.md]
origin_pr: 66
origin_pr_url: https://github.com/qmu/plgg/pull/66
origin_branch: work-20260713-094239
origin_commit: 99e0e24d
created_at: 2026-07-13T11:44:15+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# plgg-bundle bin-cache verification gotcha

## Description

plgg-bundle's bin relocates registry-installed source to a /tmp cache keyed by (version, install-path) and reuses it while the ready-marker exists. Hot-patching a consumer's node_modules source does nothing until the cache is cleared (see [22d511ab](https://github.com/qmu/plgg/commit/22d511ab) Insights; cache dirs look like `/tmp/plgg-relocate-plgg-bundle-<version>-<tag>`).

## How to Fix

Document the cache behavior in the plgg-bundle README and reference it in verification guides, including the manual cache-clear step for developers doing hot-patch verification.
