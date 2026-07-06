---
type: Concern
origin_pr: 60
origin_pr_url: https://github.com/qmu/plgg/pull/60
origin_branch: work-20260704-130317
origin_commit: 416da301
created_at: 2026-07-06T11:33:41+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# (carried from PR #51) Principle (a): design change not documented

## Description

Principle (a) ('brand only untrusted boundaries; author-typed strings stay plain') is not documented in CLAUDE.md or `.workaholic/` policy notes. The design decision is undurable.

## How to Fix

Document the principle explicitly in CLAUDE.md and reference it in new tickets.
