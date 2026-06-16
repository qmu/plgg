---
origin_pr: 40
origin_pr_url: https://github.com/qmu/plgg/pull/40
origin_branch: work-20260531-003055
origin_commit: 470506e
created_at: 2026-06-16T14:44:46+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# Renderer runtime primitives remain unimplemented

## Description

Auto-dismiss timers, focus/scroll, keyboard shortcuts/drag, and true height auto-grow are not expressible — the example uses manual dismiss, a CSS grid-rows accordion, and click-reorder as stand-ins (see [bb01985](https://github.com/qmu/plgg/commit/bb01985), [d33f70a](https://github.com/qmu/plgg/commit/d33f70a), [e8b4859](https://github.com/qmu/plgg/commit/e8b4859), [e22e70e](https://github.com/qmu/plgg/commit/e22e70e)).

## How to Fix

Open implementation tickets from the four research recommendations (effects/`Cmd` first — it unblocks the others), then replace the example's stand-ins.
