---
created_at: 2026-07-21T18:00:01+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 1h
commit_hash:
category: Changed
depends_on: []
---

# Re-assess build-the-plgg-ir-thesis-evaluator against the merged plgg-ir-thesis

## Overview

PR #83 (prove-metamodel) merged `packages/plgg-ir-thesis` (the general Thesis
dialect) and `plgg-ir-thesis-proof` to main. The still-active mission
`build-the-plgg-ir-thesis-evaluator` (0/9) is scoped to build exactly that
dialect + evaluator — so much of its foundation now exists on main. Its
progress no longer reflects reality.

## Key files

- `.workaholic/missions/active/build-the-plgg-ir-thesis-evaluator/mission.md`
  (and its `design.md` — §4 reference + §5 thirteen-case catalog).
- `packages/plgg-ir-thesis/` (as merged) — the actual delivered surface.

## Approach

- Diff the mission's 9 acceptance criteria against what `plgg-ir-thesis`
  currently provides on main.
- Tick the satisfied criteria; `/mission` replan the remainder (reframe from
  "build" to "extend/complete"), or close the mission if fully achieved.

## Quality Gate

- **Acceptance:** the mission's computed progress reflects the merged surface
  (satisfied criteria ticked) and the remainder is replanned or the mission is
  closed. No code change.

## Policies

- `workaholic:implementation` / `objective-documentation` (progress matches the
  merged reality, not a stale kickoff count).
