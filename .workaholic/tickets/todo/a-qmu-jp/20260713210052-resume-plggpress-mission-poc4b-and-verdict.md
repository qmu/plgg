---
created_at: 2026-07-13T21:00:52+09:00
author: a@qmu.jp
type: housekeeping
layer: [UX, Infrastructure]
effort: 0.1h
commit_hash:
category:
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# Resume: drive PoC 4b, re-judge & conclude PoC 4, ship the workaholic .env branch

## Overview

**Carry Origin:** session handoff on `main` (2026-07-13) — carried because
the token window was filling; continue in a fresh session. This ticket is
an ORIENTATION checkpoint; the primary work is an already-queued,
self-contained ticket (see step 1) which this does NOT supersede.

Already done this session (context — do NOT redo):

- **PoC 4 shipped**: PR #67 merged to `main` (merge `219a2877`), guide
  deployed (Deploy Guide green, `plgg.qmu.co.jp` 200), GitHub Release
  `2026.07.week2.release7`. `packages/plgg-poc4-edit` is on `main` (agent
  file edits + hot reload; edit/`/api/doc` seams; iframe isolation; voice
  + text; `gpt-realtime-2.1` pin). Live at `plgg-poc4.qmu.dev`
  (configured, mint 200) on the FIXED build.
- **PoC 4 live-judging fixes shipped** (commit `9171cf60`, in PR #67): the
  two bugs found in judging — (a) the assistant ignored an explicit
  language-switch request, (b) editing corrupted the file because the
  model was fed a lossy chunk reconstruction — are fixed (default-with-
  override language rule; retired `docTextOf`; added guarded
  `GET /api/doc?path=` so the model reads raw file bytes).
- **plggpress published**: `plggpress@0.0.4` on npm (`latest`) for
  plggmatic's docs; the version bump merged via PR #68 (merge `e9a565c6`),
  GitHub Release `2026.07.week2.release8`. `main` `package.json` now agrees
  with the registry.
- **PoC 4b ticket filed**: the co-editing-EXPERIENCE prototype is queued
  (see step 1).

Where work stopped: both PRs are merged and `main` is clean and synced
(`f7c0206b`). No code is mid-edit. The remaining work is the three items
below, in priority order.

## Policies

Orientation ticket; the load-bearing code policies live in the PoC 4b
ticket's own `## Policies` (read them when driving step 1).
`workaholic:operation` / `command-scripts` applies to steps 2–3 (reuse the
canonical `serve-poc.sh` / `/report` / `/ship` runners, no bespoke
scripts). `workaholic:implementation` / `objective-documentation` for the
verdict ticket (state measured facts).

## Implementation Steps

1. **PRIMARY — drive PoC 4b** (the co-editing experience). The full,
   self-contained spec is the queued ticket
   `.workaholic/tickets/todo/a-qmu-jp/20260713193614-poc4b-live-coediting-preview.md`.
   Create a fresh `work-YYYYMMDD-HHMMSS` branch off `main` (its PoC 4
   scaffold is now on `main`), then `/drive` it. It builds a NEW package
   `packages/plgg-poc4b-coedit` that visualizes the AI's edit ON the
   preview — micro-animation AND before/after diff, TOGGLEABLE and
   COMPARED — via granular diff edits + a live patchable preview (retiring
   the reloading iframe); portal entry `poc4b`, port 5190,
   `plgg-poc4b.qmu.dev`.
2. **SECONDARY — conclude PoC 4.** Re-judge the FIXED build live at
   `plgg-poc4.qmu.dev` (explicit language switch honored; an edit
   round-trips as clean markdown, the iframe reloads, the session
   survives). Then `/ticket` a concluding verdict ticket that flips the
   portal's `poc4` record in `packages/plgg-poc-portal/src/pocs.ts` from
   `building` to a concluded status with the measured verdict (guarded by
   `pocConsistent`, as PoC 2/3 did), and drive it.
3. **SECONDARY (other repo) — ship the workaholic `.env` branch.** In
   `~/projects/workaholic`, branch `work-20260713-144839` carries the
   worktree `.env`-copy protocol (`ensure-worktree.sh` copies the repo-root
   `.env` into new worktrees). Run `/report` then `/ship` there to land it
   on that repo's `main`. Until it merges, a NEW plgg worktree needs a
   manual `cp ../../.env .env`.

## Quality Gate

- Step 1: the PoC 4b ticket's own `## Quality Gate` governs (offline
  suite + fresh `check-all` green, headless container smoke, both viz
  modes legible, no full-page reload, session survives an edit).
- Step 2: the verdict ticket records a measured live-judging outcome and
  keeps `pocConsistent` + the portal specs green.
- Step 3: workaholic `/ship` gate (that repo's deploy contract).

## Findings

- **The reframing that produced PoC 4b (do not relitigate):** live judging
  confirmed PoC 4's mechanics work but that was the EXPECTED result. The
  confidence signal the mission actually needs is the co-editing
  EXPERIENCE — "the same whiteboard, erasing and adding together." Whole-
  file `edit_file` + a full `location.reload()` iframe are a batch-swap,
  structurally incapable of that feel. PoC 4b changes both (granular edits
  + live patchable preview).
- **A GitHub Release create right after a merge 422s once** (`target_commitish
  is invalid`) then succeeds on a plain retry — commit propagation timing.
  Both PR #67 and #68 hit this; retry `gh release create` with the full
  `origin/main` SHA. Not a real failure.
- **`check-all` in the MAIN repo failed on `plgg-poc4-edit` (TS2688,
  "Cannot find type definition file for 'node'")** until
  `scripts/npm-install.sh` ran there — the package was newly merged and its
  `node_modules` had only ever been installed in the worktree. Run
  `npm-install.sh` in the repo where you drive/ship a freshly-merged
  package before `check-all`.
- **`merge-pr.sh` checks out `main` in whatever working tree it runs from.**
  During PR #67's ship the main repo was on another branch, so it checked
  `main` out in the `.worktrees/poc4-edit` worktree — run post-merge steps
  from wherever `main` actually landed, and keep the main repo on `main`
  when shipping so this doesn't tangle.
- The container rewrites `packages/plgg-poc1-search/package-lock.json`
  (libc-field churn) on every start; `git restore` it before committing
  (standing concern `67-container-npm-rewrites-a-sibling-package.md`).

## Decisions

- **PoC 4b = a NEW portal entry**, not a redirect of PoC 4 (developer,
  2026-07-13). PoC 4 stays `building`/awaiting-verdict for the MECHANICS;
  4b (`poc4b`, port 5190) owns the EXPERIENCE question.
- **PoC 4b prototypes BOTH visualization modes, compared** (micro-animation
  AND before/after diff, toggleable) — the mission's compare-variants
  ethos — not one mode.
- **Retire the reloading iframe for the doc pane in 4b**; the shell renders
  a live, patchable, prose-focused markdown preview (losing full plggpress
  theming is an accepted PoC trade-off — the point is the change
  animation, not the chrome).
- **Credentials live in ONE git-ignored repo-root `.env`** sourced by
  `serve-poc.sh`; new worktrees get it via the workaholic protocol (step
  3) or a manual `cp` until that ships.

## Final Report

Orientation checkpoint served. **Step 1 (PRIMARY) — drive PoC 4b — is
DONE** this session: `packages/plgg-poc4b-coedit` shipped on branch
`work-20260713-215845` (granular `edit_doc`, live patchable preview, two
compared visualizations, portal `poc4b` entry, single-process workload +
fleet wiring), all offline gates green and serving live at
`plgg-poc4b.qmu.dev` for the developer's feel-judgment.

Steps 2–3 remain as FOLLOW-UPS (they do not belong on this branch and need
the developer / another repo):

- **Step 2 — conclude PoC 4**: re-judge the fixed build live at
  `plgg-poc4.qmu.dev`, then `/ticket` a concluding verdict that flips the
  portal's `poc4` record from `building` to a concluded status (guarded by
  `pocConsistent`), and drive it. PoC 4b similarly awaits its own
  concluding verdict ticket once judged.
- **Step 3 — ship the workaholic `.env` branch**: in `~/projects/workaholic`,
  `/report` then `/ship` branch `work-20260713-144839` (the worktree
  `.env`-copy protocol). Until it merges, a new plgg worktree needs a
  manual `cp ../../.env .env`.

Carry these into the next session.
