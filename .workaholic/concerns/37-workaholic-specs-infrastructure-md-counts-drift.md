---
origin_pr: 37
origin_pr_url: https://github.com/qmu/plgg/pull/37
origin_branch: work-20260528-143038
origin_commit: 903308e
created_at: 2026-05-30T12:51:26+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# `.workaholic/specs/infrastructure.md` counts drift (new)

## Description

The infrastructure doc still describes "four packages / twenty scripts"; the repo is now ten packages and ~40+ scripts. The path tokens were updated during the restructure but the inventory counts and diagrams were not.

## How to Fix

A small doc-refresh ticket to update the inventory table and mermaid diagrams. Non-blocking (reference doc, not enforcement).
