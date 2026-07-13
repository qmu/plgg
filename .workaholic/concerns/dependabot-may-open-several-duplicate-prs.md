---
origin_pr: 49
origin_pr_url: https://github.com/qmu/plgg/pull/49
origin_branch: work-20260628-010653
origin_commit: f06fbba
created_at: 2026-06-29T11:27:59+09:00
last_seen: 2026-07-03T02:00:50+09:00
first_seen: 2026-06-29T11:27:59+09:00
concern_id: dependabot-may-open-several-duplicate-prs
severity: low
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# Dependabot may open several duplicate PRs on first run

## Description

Enabling version updates across 13 `packages/*` workspaces means the first weekly run may open several PRs bumping the same dependency (e.g. happy-dom) across multiple packages. This is expected behavior, not a failure (see [ba279e1](https://github.com/qmu/plgg/commit/ba279e1) in `.github/dependabot.yml`).

## How to Fix

No fix needed. If PR volume becomes unwieldy, add Dependabot grouping rules in a follow-up.
