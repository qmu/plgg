---
origin_pr: 46
origin_pr_url: https://github.com/qmu/plgg/pull/46
origin_branch: work-20260624-135934
origin_commit: c4dc8f1
created_at: 2026-06-26T21:43:57+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# (carried from PR #37) TEA minimum has no effects hydration

## Description

The TEA Cmd/Sub/hydration gap is a renderer-runtime concern; the test migration did not implement any effects seam.

## How to Fix

Design and implement a renderer-native effects hydration seam (Cmd/Sub for effects like timers, focus, layout) to complete the TEA runtime.
