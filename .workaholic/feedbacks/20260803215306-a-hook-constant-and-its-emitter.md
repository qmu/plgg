---
type: Feedback
title: A hook constant and its emitter can still drift in one direction
kind: concern
source: development
created_at: 2026-08-03T21:53:06+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: a-hook-constant-and-its-emitter
owner: 
mission: []
tickets: [20260728100000-export-plggmatic-component-hooks.md]
origin_pr: 99
origin_pr_url: https://github.com/qmu/plgg/pull/99
origin_branch: work-20260801-210449
origin_commit: a04b62aa
last_seen: 2026-08-03T21:53:06+09:00
---

# A hook constant and its emitter can still drift in one direction

## Description

The emitters now import the constants, so a renamed hook

## How to Fix

A gate over `packages/plggmatic/src` that fails on
