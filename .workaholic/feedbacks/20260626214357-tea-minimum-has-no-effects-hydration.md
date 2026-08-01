---
type: Feedback
title: (carried from PR #37) TEA minimum has no effects hydration
kind: concern
source: development
created_at: 2026-06-26T21:43:57+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: tea-minimum-has-no-effects-hydration
owner: 
mission: 
tickets: []
origin_pr: 46
origin_pr_url: https://github.com/qmu/plgg/pull/46
origin_branch: work-20260624-135934
origin_commit: c4dc8f1
last_seen: 2026-06-26T21:43:57+09:00
closed: superseded
---

# (carried from PR #37) TEA minimum has no effects hydration

## Description

The TEA Cmd/Sub/hydration gap is a renderer-runtime concern; the test migration did not implement any effects seam.

## How to Fix

Design and implement a renderer-native effects hydration seam (Cmd/Sub for effects like timers, focus, layout) to complete the TEA runtime.
