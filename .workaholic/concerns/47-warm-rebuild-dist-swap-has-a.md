---
origin_pr: 47
origin_pr_url: https://github.com/qmu/plgg/pull/47
origin_branch: work-20260626-221353
origin_commit: 3adc809
created_at: 2026-06-27T19:52:31+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# Warm-rebuild dist swap has a microsecond absence window

## Description

the atomic-publish fix uses a two-rename dance on warm rebuilds, leaving a microsecond window where a package `dist` is briefly absent (loud ENOENT fail, never a torn/silent read); the cold/CI path is a single rename with zero window (see [d77ce03](https://github.com/qmu/plgg/commit/d77ce03) in `packages/plgg-bundle/src/domain/usecase/build.ts`).

## How to Fix

if warm-rebuild concurrency ever bites in practice, close it fully with a symlink-swap publish; not worth it now (cold/CI is the gated path).
