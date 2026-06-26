---
origin_pr: 46
origin_pr_url: https://github.com/qmu/plgg/pull/46
origin_branch: work-20260624-135934
origin_commit: c4dc8f1
created_at: 2026-06-26T21:43:57+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# (carried from PR #41) Shared boundary error primitive not yet factored

## Description

No shared `Box<Tag,{message,cause}>` / `liftThrow` primitive was factored; Defect/SqlError/HttpError still re-implement the shape.

## How to Fix

Factor a shared error-boundary primitive and refactor Defect/SqlError/HttpError to use it, reducing duplication and improving error-handling consistency.
