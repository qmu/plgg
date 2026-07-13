---
type: Concern
concern_id: the-two-phase-erase-write-animation
mission: plggpress-technical-confidence-poc-portal
tickets: [20260713193614-poc4b-live-coediting-preview.md, 20260713210052-resume-plggpress-mission-poc4b-and-verdict.md]
origin_pr: 69
origin_pr_url: https://github.com/qmu/plgg/pull/69
origin_branch: work-20260713-215845
origin_commit: dd354db3
created_at: 2026-07-14T00:09:18+09:00
first_seen: 2026-07-14T00:09:18+09:00
last_seen: 2026-07-14T00:09:18+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# The two-phase erase→write animation is unverified in a real browser

## Description

The micro-animation (erase dwell → write-in via plgg-view's WAAPI `transition`/`slideIn`/`fadeOut` + keyed reconciliation, timed by `REVEAL_MS`) is covered only at the reducer/data level; no browser rendered it in this environment (Chrome was unavailable for a headless check) — see [43fb3c2d](https://github.com/qmu/plgg/commit/43fb3c2d) in `packages/plgg-poc4b-coedit/src/view.ts` and `effects.ts`. The keyed reconciliation re-trigger and the erase→write timing are the parts most likely to need tuning.

## How to Fix

Fold the visual verification into the developer's live judging session; if the timing reads wrong, tune `REVEAL_MS` and the enter/exit motions (they are an isolated seam, not logic).
