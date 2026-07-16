---
type: Concern
concern_id: ticket-diagnostics-measurements-held-conclusions-did
mission: [plggpress-technical-confidence-poc-portal]
tickets: [20260714214628-poc4-real-html-preview-with-4b-diff.md, 20260716125235-conclude-poc5-verdict-proven.md, 20260716125236-conclude-poc6-verdict-proven.md]
origin_pr: 73
origin_pr_url: https://github.com/qmu/plgg/pull/73
origin_branch: work-20260716-023712
origin_commit: 13d849c3
created_at: 2026-07-16T15:27:33+09:00
first_seen: 2026-07-16T15:27:33+09:00
last_seen: 2026-07-16T15:27:33+09:00
severity: low
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# Ticket diagnostics: measurements held, conclusions did not

## Description

The two queued tickets' STATUS findings (recorded in [54c41815](https://github.com/qmu/plgg/commit/54c41815)) show a recurring failure shape: accurate measurements (tarball inspection, dist listings, port probes) paired with premature conclusions (e.g. reading `.d.ts` declaration trees as emitted module trees). The plgg-mcp ticket remains open on a package-boundary decision, with `bun` absent on this host making its quality gate unrunnable as written.

## How to Fix

In diagnostic tickets, separate measurements from conclusions so each can be verified independently; restate environment-dependent gates (bun) as module-graph assertions runnable in this repo's pipeline.
