---
type: Feedback
title: (carried from PR #59) Lexer fidelity limitations
kind: concern
source: development
created_at: 2026-07-06T11:33:41+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: lexer-fidelity-limitations
owner: 
mission: 
tickets: []
origin_pr: 60
origin_pr_url: https://github.com/qmu/plgg/pull/60
origin_branch: work-20260704-130317
origin_commit: 416da301
last_seen: 2026-07-06T11:33:41+09:00
---

# (carried from PR #59) Lexer fidelity limitations

## Description

plgg-highlight's cosmetic lexing limitations (non-ASCII/`\u` identifiers as plain, generic JSX) are unchanged. The exact-source round-trip invariant still holds.

## How to Fix

Deferred by design; revisit when a non-ASCII or JSX consumer needs precision.
