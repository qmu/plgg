---
type: Feedback
title: TS-printer shape dependency in externals-key rewrite
kind: concern
source: development
created_at: 2026-07-13T11:44:15+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: ts-printer-shape-dependency-in-externals
owner: 
mission: 
tickets: [20260712014000-plgg-bundle-flattens-nested-bundles-with-colliding-module-keys.md]
origin_pr: 66
origin_pr_url: https://github.com/qmu/plgg/pull/66
origin_branch: work-20260713-094239
origin_commit: 99e0e24d
last_seen: 2026-07-13T11:44:15+09:00
---

# TS-printer shape dependency in externals-key rewrite

## Description

The externals-key rewrite in collectModules.ts matches the exact TS-printer output shape `"<spec>": __extN` (see [22d511ab](https://github.com/qmu/plgg/commit/22d511ab) in packages/plgg-bundle/src/domain/usecase/collectModules.ts). A future TypeScript version or custom printer emitting the externals table in a different format would silently skip the rewrite, causing the same runtime failure to resurface in downstream consumers.

## How to Fix

Extract the externals-table printing and rewriting into an abstraction with a public contract, making the shape dependency explicit and testable independent of TS-printer internals. Document the shape assumption in comments at both emission and rewrite sites.
