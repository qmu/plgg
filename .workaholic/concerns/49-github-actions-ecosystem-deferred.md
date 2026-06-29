---
origin_pr: 49
origin_pr_url: https://github.com/qmu/plgg/pull/49
origin_branch: work-20260628-010653
origin_commit: f06fbba
created_at: 2026-06-29T11:27:59+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# github-actions ecosystem deferred

## Description

The ci-workflow-shell-injection ticket recommended adding `package-ecosystem: github-actions` for action-SHA pinning. This branch's `.github/dependabot.yml` covers npm only, intentionally deferring the github-actions ecosystem to avoid scope creep (see [ba279e1](https://github.com/qmu/plgg/commit/ba279e1) in `.github/dependabot.yml`).

## How to Fix

Open a follow-up ticket to add `package-ecosystem: github-actions` to `.github/dependabot.yml` with a schedule/versioning strategy (deferred from ci-workflow-shell-injection).
