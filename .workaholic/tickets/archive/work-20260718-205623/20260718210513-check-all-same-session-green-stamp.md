---
created_at: 2026-07-18T21:05:13+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Config]
effort: 2h
commit_hash:
category: Added
depends_on:
mission: modernize-plgg-bundle
---

# Gate auto-skip: record a same-session green check-all stamp

## Overview

Without `SKIP_GATE=1`, `scripts/publish-npm.sh` re-runs the full
`scripts/check-all.sh` (fresh rebuild of every package + every test suite —
minutes) even for a single-package patch publish. The only lever today is the
caller remembering to export `SKIP_GATE=1` (read at one place, `publish-npm.sh`
line ~155) — error-prone, and there is **no stamp mechanism at all** (grep
confirms no file/hash/timestamp).

Introduce a **same-session green stamp**: `check-all.sh`, on a fully green run,
records a stamp capturing the working-tree state it certified; `publish-npm.sh`
**auto-skips** the gate when a valid stamp matches the current tree — so
`SKIP_GATE=1` stops being something a human must remember.

## Key files

- `scripts/check-all.sh` — the canonical gate (gates → `build.sh` → all
  `test-*.sh`). Add the stamp write at the end, only on exit 0.
- `scripts/publish-npm.sh` — the gate decision (lines ~137–159): replace the
  bare `SKIP_GATE` check with "valid same-session stamp OR `SKIP_GATE=1`".

## Approach

- On a green `check-all.sh`, write a stamp (e.g. `.check-all-green.stamp`,
  git-ignored) recording a **content hash of the tracked working tree**
  (`git -C . rev-parse HEAD` + `git status --porcelain` digest, or
  `git stash create`-style tree hash) so the stamp is invalidated by any edit.
- `publish-npm.sh` computes the same digest and skips the gate iff the stamp
  matches; otherwise it runs `check-all.sh` as today. `SKIP_GATE=1` remains an
  explicit override. Print which path was taken (`gate: skipped (same-session
  green <shorthash>)` / `gate: running check-all`).

## Quality Gate

- **Acceptance:** after a green `check-all.sh`, a subsequent `publish-npm.sh`
  (with a publish set) **does not re-run** the gate and says so; touching any
  tracked source file invalidates the stamp and the next `publish-npm.sh`
  **does** run `check-all.sh`. Demonstrate both transitions.
- **No false green:** the digest covers tracked, checked-out state such that an
  uncommitted edit after the stamp is detected (the stamp is a tree hash, not a
  timestamp). Cover the digest+match logic with a unit test over a temp tree.
- **Override preserved:** `SKIP_GATE=1` still skips unconditionally.
- Stamp file is git-ignored (add to `.gitignore`); `scripts/check-all.sh`
  green.

## Policies

- `workaholic:operation` / `local-ci-cd-execution` (release gate stays local
  and script-driven; this makes the gate cheaper, never absent).
- `workaholic:implementation` / `objective-documentation` (the skip is decided
  by a checkable tree digest, never "looks unchanged").
- `workaholic:design` / `vendor-neutrality` (git + shell only; no new dep).
