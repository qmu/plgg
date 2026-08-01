---
type: Feedback
title: (carried from PR #41) Version bump covers only plgg and plgg-test
kind: concern
source: development
created_at: 2026-06-26T21:43:57+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: version-bump-covers-only-plgg-and
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

# (carried from PR #41) Version bump covers only plgg and plgg-test

## Description

No monorepo versioning policy or cross-package version bumps were introduced; the branch is a test-framework migration with no publish implications addressed.

## How to Fix

Design and implement a monorepo versioning policy covering all packages; automate version bumps and release-note generation for coordinated multi-package releases.
