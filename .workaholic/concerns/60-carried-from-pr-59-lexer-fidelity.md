---
type: Concern
origin_pr: 60
origin_pr_url: https://github.com/qmu/plgg/pull/60
origin_branch: work-20260704-130317
origin_commit: 416da301
created_at: 2026-07-06T11:33:41+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# (carried from PR #59) Lexer fidelity limitations

## Description

plgg-highlight's cosmetic lexing limitations (non-ASCII/`\u` identifiers as plain, generic JSX) are unchanged. The exact-source round-trip invariant still holds.

## How to Fix

Deferred by design; revisit when a non-ASCII or JSX consumer needs precision.
