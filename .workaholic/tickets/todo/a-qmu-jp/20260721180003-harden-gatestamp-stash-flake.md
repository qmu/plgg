---
created_at: 2026-07-21T18:00:03+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort: 1h
commit_hash:
category: Changed
depends_on: []
---

# Harden gateStamp against transient `git stash create` failure

## Overview

`scripts/gateStamp.ts` computes the tracked-tree digest via `git stash create`
(around lines 46/62). Observed **reproducibly (2/2 runs, in two different
worktrees, 2026-07-21)**: this call throws `Error: Command failed: git stash
create` (status 1, empty output) at the **end** of `check-all` — **after** all
gates, builds, every test suite, and the coverage gate already passed — so
`check-all` exits 1 on a genuinely green branch. Run standalone immediately
after, `git stash create` succeeds (exit 0). The likely cause is contention on
the stash stack, which is shared across worktrees/sessions.

## Key files

- `scripts/gateStamp.ts` (`treeDigest` and the `git()` `execFileSync` wrapper).
- `scripts/gateStamp.spec.ts` (unit tests must stay green).

## Approach

- Make `treeDigest` tolerant: either **retry** `git stash create` a few times
  with a short backoff, or replace it with a **lock-free** tree digest (e.g.
  `git write-tree` against a temporary index, or `HEAD^{tree}` combined with a
  hash of `git diff`), so a passing `check-all` can never fail on this
  bookkeeping step.

## Quality Gate

- **Acceptance:** a `check-all` whose validation passes never exits non-zero at
  the stamp step; a simulated transient stash failure is retried/tolerated; the
  gateStamp unit tests stay green. No new dependency.

## Policies

- `workaholic:implementation` / fault-tolerance (a transient git op must not
  fail an otherwise-green gate).
- `workaholic:operation`.
