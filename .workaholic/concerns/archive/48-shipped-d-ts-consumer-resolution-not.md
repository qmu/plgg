---
origin_pr: 48
origin_pr_url: https://github.com/qmu/plgg/pull/48
origin_branch: work-20260627-205005
origin_commit: 80b301f
created_at: 2026-06-28T01:22:01+09:00
last_seen: 2026-06-28T01:22:01+09:00
first_seen: 2026-06-28T01:22:01+09:00
concern_id: shipped-d-ts-consumer-resolution-not
severity: low
status: resolved
resolved_by_pr: 0e7f9cd
resolved_by_commit: 
---

# Shipped `.d.ts` consumer-resolution not yet verified across tsconfigs

## Description

the package uses `moduleResolution: Bundler`; its emitted `dist/index.d.ts` resolves under `check-all`, but a consumer importing it under a `NodeNext` tsconfig has not been probed (deferred from T3; there is no internal consumer yet). See [b76121e](https://github.com/qmu/plgg/commit/b76121e).

## How to Fix

when a consumer adopts the package, type-resolve it under both Bundler and NodeNext consumer configs; fix the `rewriteDtsAliases` output if needed.
