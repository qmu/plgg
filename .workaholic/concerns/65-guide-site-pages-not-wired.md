---
type: Concern
origin_pr: 65
origin_pr_url: https://github.com/qmu/plgg/pull/65
origin_branch: work-20260712-003839
origin_commit: 1696ae90
created_at: 2026-07-12T11:39:12+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# Guide-site pages for the plgg-ir family are not wired

## Description

The mission's three-layer documentation is satisfied by the package READMEs plus `docs/plgg-ir/guide.md`; the plggpress-built guide site (`packages/guide`) has no plgg-ir pages, so the documentation is repo-local rather than published on plgg.qmu.co.jp (see [1696ae90](https://github.com/qmu/plgg/commit/1696ae90)).

## How to Fix

Add guide-site pages sourcing from the same content when the family stabilizes (post-plggmatic-consumer), keeping the READMEs as the source of truth.
