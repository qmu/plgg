---
type: Feedback
title: No risk register exists for an accepted vulnerability
kind: concern
source: development
created_at: 2026-08-11T19:32:47+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: no-risk-register-exists-for-an
owner: 
mission: []
tickets: [20260806211627-remove-the-poc-fleet-packages.md, 20260806211628-untrack-stale-lockfiles-and-fix-dependabot-config.md]
origin_pr: 111
origin_pr_url: https://github.com/qmu/plgg/pull/111
origin_branch: work-20260807-001644
origin_commit: 34da750a
last_seen: 2026-08-11T19:32:47+09:00
---

# No risk register exists for an accepted vulnerability

## Description

`workaholic:safety` / risk-management requires an accepted risk to be recorded by name with a decision-maker and a time limit, in operating documents under `docs/safety/`. That directory does not exist. Today's finding was disposed of by removal so nothing needed accepting, but the next dev-only advisory has no sanctioned destination — and the repository has already made such a call once informally (the lodash finding in the unpublished `example` package, recorded in `.workaholic/policies/security.md`).

## How to Fix

Create the register when the first advisory genuinely needs accepting rather than pre-building it, and move the existing lodash note into it at that point.
