---
created_at: 2026-07-13T14:45:22+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 0.5h
commit_hash: 8c188a19
category: Added
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# Credentials from ONE git-ignored root .env, sourced by the canonical PoC runner

## Overview

Developer directive (2026-07-13, live during PoC 4 bring-up): as the PoC
fleet accumulates credentials (OPENAI_API_KEY today, more to come), they
live in a single git-ignored `.env` at the REPOSITORY ROOT — never
per-package or per-workload `.env` files, never ad-hoc shell exports.
Rationale: this host runs several parallel worktrees under `.worktrees/`;
a root-level `.env` is the one location the worktree-creation protocol can
copy from the root repository into each new worktree, so every worktree
starts with working credentials. A per-package file is invisible to that
protocol and scatters secrets.

Two halves; this ticket is the PLGG half:

1. **plgg (this ticket):** the canonical fleet runner
   `scripts/serve-poc.sh` sources `$REPO_ROOT/.env` (exported) before
   compose interpolation, so every `${OPENAI_API_KEY:-}`-style passthrough
   in every `workloads/*/compose.yaml` picks the root file up with no
   per-workload wiring. Add a committed `.env.example` naming the known
   keys; point the PoC READMEs at the root file instead of "export the
   key first".
2. **workaholic (companion ticket in that repo):** the branching skill's
   `ensure-worktree.sh` copies the root repository's `.env` into a newly
   created worktree right after `git worktree add`.

The root `.gitignore` already ignores `.env` / `.env.*` and allows
`.env.example` — no change needed there.

## Policies

- `workaholic:operation` / command-scripts — ONE canonical runner: the
  sourcing lives in `scripts/serve-poc.sh` only, not copied into each
  workload; no bespoke per-PoC env scripts.
- `workaholic:design` / defense-in-depth — the standing key still never
  reaches a browser or the repo history: `.env` is git-ignored, compose
  passes values only into containers that already declare the variable.
- `workaholic:implementation` / objective-documentation — READMEs state
  the actual lookup order (root `.env` sourced by serve-poc.sh; a real
  environment variable still wins because sourcing must not clobber it).

## Key Files

- `scripts/serve-poc.sh` - the canonical runner; add the root-.env
  sourcing before the compose invocation
- `.env.example` - NEW: the committed catalog of known keys
- `.gitignore` - already correct (`.env` ignored, `!.env.example` kept)
- `packages/plgg-poc4-edit/README.md`, `packages/plgg-poc3-voice/README.md`,
  `packages/plgg-poc-portal/README.md` - replace "export OPENAI_API_KEY
  first" phrasing with the root-.env convention
- `workloads/*/compose.yaml` - unchanged; their `${OPENAI_API_KEY:-}`
  interpolation is exactly the seam the sourcing feeds

## Implementation Steps

1. `scripts/serve-poc.sh`: after resolving `REPO_ROOT`, if
   `"$REPO_ROOT/.env"` exists, `set -a; . "$REPO_ROOT/.env"; set +a` —
   but WITHOUT overriding variables already set in the caller's
   environment (an explicit `VAR=… scripts/serve-poc.sh …` must still
   win). Note the precedence in a comment.
2. Add root `.env.example` documenting `OPENAI_API_KEY` (and the copy
   convention), so a fresh clone knows what to create.
3. Update the three PoC READMEs' run instructions to name the root
   `.env` as the credential home.
4. Verify: with a throwaway value in `$REPO_ROOT/.env`, `serve-poc.sh
   poc4-edit` recreates the container and `/api/health` answers
   `{"configured":true}`; with the file absent the script still runs
   (keyless honest state).

## Quality Gate

- `sh -n scripts/serve-poc.sh` clean; running it with no root `.env`
  behaves exactly as today (no unbound-variable failure under `set -eu`).
- With a key present in the root `.env`, the poc4 workload's
  `/api/health` flips to configured (verified live once the developer
  places the real key).
- An explicit environment variable set by the caller overrides the file.
- No secrets in the diff: `.env.example` carries placeholder text only.

## Considerations

- `set -a; . file` exports everything the file defines — keep
  `.env.example` (and by convention `.env`) to `KEY=value` lines only.
- Do-not-override precedence needs a guard per variable; simplest is to
  snapshot pre-existing values or source into a subshell and export only
  missing names. Implementation may choose either, but the precedence
  must hold (Quality Gate line 3).
- The workaholic-side copy step is intentionally OUT of this ticket
  (different repository, its own ticket flow); until it ships, a new
  worktree needs a one-time manual `cp ../../.env .env`.
