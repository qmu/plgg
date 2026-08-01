---
type: Feedback
title: Principle (a) design change: author-facing strings stay plain
kind: concern
source: development
created_at: 2026-07-03T02:00:50+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: principle-a-design-change-author-facing
owner: 
mission: 
tickets: []
origin_pr: 51
origin_pr_url: https://github.com/qmu/plgg/pull/51
origin_branch: work-20260701-185044
origin_commit: efd21c0
last_seen: 2026-07-16T15:11:50+09:00
---

# Principle (a) design change: author-facing strings stay plain

## Description

The blanket SoftStr→Str sweep (ticket 013300) and case-shaped KebabCase branding (013301) were reversed under principle (a) — author-facing strings (config literals, endpoint URLs, request paths) produce no-op box() friction; only untrusted boundaries warrant brands (see [86c02b7](https://github.com/qmu/plgg/commit/86c02b7) and [61663d3](https://github.com/qmu/plgg/commit/61663d3))

## How to Fix

Document principle (a) durably (CLAUDE.md or a policies note): "Brand only untrusted boundaries (parsed input, network responses, config decode); author-typed fields stay plain to avoid no-op constructor friction."
