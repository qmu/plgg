---
type: Concern
concern_id: preview-drops-plggpress-theming-accepted-poc
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

# Preview drops plggpress theming (accepted PoC trade-off)

## Description

Retiring the iframe means the preview is prose-focused markdown, not the real themed plggpress page (see [43fb3c2d](https://github.com/qmu/plgg/commit/43fb3c2d) in `packages/plgg-poc4b-coedit/src/view.ts`). This was an accepted trade-off — the point is the change animation, not the chrome — but it is a real difference from PoC 4.

## How to Fix

If the developer wants themed rendering in the preview later, that is a follow-up PoC, not this one.
