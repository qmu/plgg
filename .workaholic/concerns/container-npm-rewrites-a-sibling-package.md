---
type: Concern
mission: plggpress-technical-confidence-poc-portal
tickets: [20260712152250-poc4-agent-file-edits-hot-reload.md, 20260713115737-resume-poc4-plggpress-mission.md, 20260713144522-root-env-file-for-credentials.md, 20260713150647-poc4-speak-document-language.md, 20260713151530-poc4-pin-gpt-realtime-2-1.md, 20260713183700-resume-poc4-two-live-judging-bugs.md]
origin_pr: 67
origin_pr_url: https://github.com/qmu/plgg/pull/67
origin_branch: work-20260712-174248
origin_commit: 219a2877
created_at: 2026-07-13T20:35:07+09:00
last_seen: 2026-07-13T20:35:07+09:00
first_seen: 2026-07-13T20:35:07+09:00
concern_id: container-npm-rewrites-a-sibling-package
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# Container npm rewrites a sibling package-lock on the mounted tree

## Description

The in-container npm (node:22-slim's version) rewrites `packages/plgg-poc1-search/package-lock.json` (libc-field churn) on the bind-mounted tree at every container start; the churn was reverted twice on this branch and will recur (see [f98d1714](https://github.com/qmu/plgg/commit/f98d1714), `workloads/poc4-edit/dev-entrypoint.sh`).

## How to Fix

Align the in-container npm version with the host's (pin the base image or npm), or stop bind-mounting lockfiles the entrypoint installs over (e.g. per-package named volumes); until then, `git restore` the churned lockfile before committing.
