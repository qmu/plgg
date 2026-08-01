---
type: Feedback
title: `tsc-plgg.sh` only type-checks the plgg core package
kind: concern
source: development
created_at: 2026-06-16T14:44:46+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: tsc-plgg-sh-only-type-checks
owner: 
mission: 
tickets: []
origin_pr: 40
origin_pr_url: https://github.com/qmu/plgg/pull/40
origin_branch: work-20260531-003055
origin_commit: 470506e
last_seen: 2026-06-16T14:44:46+09:00
closed: resolved
resolved_by_pr: 1ce90e0
---

# `tsc-plgg.sh` only type-checks the plgg core package

## Description

The canonical typecheck only runs `tsc` in `packages/plgg`, so per-package type errors slip through every "tsc clean" gate — three real errors (a non-exhaustive `ClientError` match, `Object.hasOwn` under an older lib, spec index-access) reached commits and were only caught by the dts build (see [1197806](https://github.com/qmu/plgg/commit/1197806)).

## How to Fix

Make `scripts/tsc-plgg.sh` typecheck every package (or have CI run `scripts/build.sh`, whose dts step does), so the typecheck gate covers the whole monorepo.
