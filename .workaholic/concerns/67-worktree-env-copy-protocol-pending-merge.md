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

# Worktree .env copy protocol pending merge in the workaholic repo

## Description

The companion protocol change (workaholic `ensure-worktree.sh` copies the root repository's `.env` into new worktrees) is committed on workaholic branch `work-20260713-144839` but not yet merged; until it lands, new and pre-existing worktrees need a manual `cp` of the root `.env`, and harness-created worktrees bypass the protocol entirely (see [997d08fc](https://github.com/qmu/plgg/commit/997d08fc) in `scripts/serve-poc.sh`).

## How to Fix

Ship the workaholic branch; for worktrees created by other paths, copy the root `.env` manually as documented in `.env.example`.
