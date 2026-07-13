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

# Live judging of the FIXED PoC 4 build remains pending

## Description

The two live-judging bugs are fixed and the live container recreated, but the developer has not yet re-judged the corrected build (explicit language switch honored; edits round-trip as clean markdown; session survives). The poc4 verdict flip is still a separate concluding ticket, per the PoC 2/3 precedent (see [f98d1714](https://github.com/qmu/plgg/commit/f98d1714) in `packages/plgg-poc4-edit`).

## How to Fix

Re-judge live, then file the concluding verdict ticket flipping the portal's poc4 record from `building` to a concluded status (guarded by `pocConsistent`).
