---
type: Concern
mission: plggpress-technical-confidence-poc-portal
tickets: [20260712152250-poc4-agent-file-edits-hot-reload.md, 20260713115737-resume-poc4-plggpress-mission.md, 20260713144522-root-env-file-for-credentials.md, 20260713150647-poc4-speak-document-language.md, 20260713151530-poc4-pin-gpt-realtime-2-1.md, 20260713183700-resume-poc4-two-live-judging-bugs.md]
origin_pr: 67
origin_pr_url: https://github.com/qmu/plgg/pull/67
origin_branch: work-20260712-174248
origin_commit: 219a2877
created_at: 2026-07-13T20:35:07+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# The co-editing EXPERIENCE is unproven — PoC 4 proved only the mechanics

## Description

Live judging (2026-07-13) confirmed PoC 4's mechanics work (agent edit → disk → reload → session survives) but that was the expected result; the whole-file `edit_file` plus the full iframe `location.reload()` cannot deliver the "same whiteboard" co-editing feel the mission actually needs — the change is a batch swap, not a legible in-place edit (see [9171cf60](https://github.com/qmu/plgg/commit/9171cf60) in `packages/plgg-poc4-edit`).

## How to Fix

PoC 4b (ticket `20260713193614-poc4b-live-coediting-preview.md`, queued): granular diff edits + a live patchable preview that visualizes the change ON the preview (micro-animation and before/after diff, compared), retiring the reloading iframe. Drive from a fresh main branch after this PR merges.
