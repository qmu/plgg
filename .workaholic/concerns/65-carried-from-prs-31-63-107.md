---
type: Concern
origin_pr: 65
origin_pr_url: https://github.com/qmu/plgg/pull/65
origin_branch: work-20260712-003839
origin_commit: 1696ae90
created_at: 2026-07-12T11:39:12+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# (carried from PRs #31–#63) 107 standing deferred concerns remain active

## Description

This branch added three new packages, scripts wiring, docs, and mission records; the 107 still-active concerns from PRs #31–#63 target plgg-web/plgg-sql/plggmatic/plggpress/plgg-bundle/plgg-parser/plgg-highlight and PoC operational items, none of which changed here — zero were resolvable by this branch. One is materially advanced: the plgg-ir half of "DSL division of labor between plgg-ir and the screen-structure mission" (63-dsl-division-of-labor-between-plgg.md) is now exercised by five real tickets — the generic toolchain stands alone and hosts the manifest dialect without leaks; the plggmatic-side evaluation remains open.

## How to Fix

Address them as their target areas are worked on; the division-of-labor concern closes when qmu/plggmatic's DSL v1 ticket decides whether to build on this family.
