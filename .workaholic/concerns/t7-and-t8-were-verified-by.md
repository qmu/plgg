---
origin_pr: 48
origin_pr_url: https://github.com/qmu/plgg/pull/48
origin_branch: work-20260627-205005
origin_commit: 80b301f
created_at: 2026-06-28T01:22:01+09:00
last_seen: 2026-07-03T02:00:50+09:00
first_seen: 2026-06-28T01:22:01+09:00
concern_id: t7-and-t8-were-verified-by
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# T7 and T8 were verified by the lead alone, not the three-agent QA

## Description

T1–T6 passed Constructor→Architect→Planner consensus; T7 (per-tenant concurrency) and T8 (example/docs) were driven and verified solo by the lead after the team stood down (see [41a089e](https://github.com/qmu/plgg/commit/41a089e), [53319cf](https://github.com/qmu/plgg/commit/53319cf)). Verification was equivalent in kind (tsc + 75 tests + the concurrency race + check-all + running the example), but without the independent Architect review / Planner E2E those two tickets had on the others — notably for T7, the riskiest (concurrency) ticket.

## How to Fix

if desired, have the Architect re-review `migrateTenant.ts` and the Planner run the authoritative cross-process (2-worker) variant of the cold-start race before relying on the per-tenant path in production.
