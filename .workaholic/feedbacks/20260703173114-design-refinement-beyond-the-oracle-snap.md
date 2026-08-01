---
type: Feedback
title: Design refinement beyond the oracle: snap text color on hover, fade only the background
kind: concern
source: development
created_at: 2026-07-03T17:31:14+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: design-refinement-beyond-the-oracle-snap
owner: 
mission: 
tickets: []
origin_pr: 53
origin_pr_url: https://github.com/qmu/plgg/pull/53
origin_branch: work-20260703-050355
origin_commit: 0ddb00d
last_seen: 2026-07-03T17:31:14+09:00
---

# Design refinement beyond the oracle: snap text color on hover, fade only the background

## Description

During sign-off, interactive elements (sidebar pills, links, toggle, etc.) were discovered to cross low-contrast states mid-fade when both color and background animate together; this branch refined the oracle's behavior by snapping text color instantly while only the background fades, keeping legibility through the entire transition. This is a deliberate divergence from qmu.co.jp's implementation, recorded as a successful refinement discovered through feel testing. (see [d8fdd82](https://github.com/qmu/plgg/commit/d8fdd82))

## How to Fix

This refinement is locked in by spec pins on transitionProperty; keep the instant-snap behavior for future theme updates
