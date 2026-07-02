---
origin_pr: 51
origin_pr_url: https://github.com/qmu/plgg/pull/51
origin_branch: work-20260701-185044
origin_commit: efd21c0
created_at: 2026-07-03T02:00:50+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# Stale committed dists mask type drift until a fresh rebuild

## Description

Two latent type drifts (plggmatic build.ts copyAssets, plgg-press build.ts) hid behind stale committed dists until check-all.sh's fresh rebuild exposed them (fixed in [740d7a8](https://github.com/qmu/plgg/commit/740d7a8) and [bb41c15](https://github.com/qmu/plgg/commit/bb41c15))

## How to Fix

Keep check-all.sh's fresh-rebuild pass as a mandatory pre-merge gate in CI; run it after any dependency type change
