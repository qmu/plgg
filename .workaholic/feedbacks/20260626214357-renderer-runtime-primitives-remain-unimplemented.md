---
type: Feedback
title: (carried from PR #40) Renderer runtime primitives remain unimplemented
kind: concern
source: development
created_at: 2026-06-26T21:43:57+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: renderer-runtime-primitives-remain-unimplemented
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

# (carried from PR #40) Renderer runtime primitives remain unimplemented

## Description

Renderer runtime primitives (timers, focus, drag, height auto-grow) remain unimplemented; untouched by the migration.

## How to Fix

Design and implement renderer-native runtime primitives (timers, focus management, drag/drop, layout callbacks) to complete the rendering system.
