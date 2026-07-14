---
created_at: 2026-07-14T00:43:50+09:00
author: a@qmu.jp
type: housekeeping
layer: [UX, Infrastructure]
effort:
commit_hash:
category:
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# Resume: conclude PoC 4 verdict (PoC 4b already concluded; workaholic .env re-homed)

## Overview

**Carry Origin:** session handoff on `main` — carried 2026-07-14. This is an
ORIENTATION checkpoint; the remaining step spawns its own `/ticket`
(concluding verdict) which `/drive` then implements — it does NOT supersede a
queued ticket.

Already done (context — do NOT redo):

- **PoC 4b CONCLUDED — proven.** The developer live-judged PoC 4b and it was
  recorded: PR #70 merged (merge `fbd50e01`), Release
  `2026.07.week2.release10`; the `poc4b` record in `pocs.ts` is now
  `proven` ("Animation mode wins — co-editing feels real"), the portal at
  `plgg-poc.qmu.dev` shows it. (Its earlier ship — the package itself — was
  PR #69 / Release `2026.07.week2.release9`.)

- **PoC 4b shipped.** PR #69 merged to `main` (merge `dd354db3`, `main` now
  `7ed7d45a`); `Deploy Guide` run `29260818686` succeeded and
  `https://plgg.qmu.co.jp/` returns 200; GitHub Release
  `2026.07.week2.release9` published. The new package
  `packages/plgg-poc4b-coedit` (granular `edit_doc` + live patchable preview
  + two compared viz modes; iframe retired; single-process shell) is on
  `main`, offline-green (52 specs, coverage gate passed, fresh `check-all`
  EXIT 0), and the write seam was headless-smoke-verified.
- **PoC 4b is serving live NOW** at `plgg-poc4b.qmu.dev` (behind Cloudflare
  Access) via the `poc4b-coedit` container on host **5190** (`configured:true`
  — the mint key reached it). The cloudflared ingress route
  `plgg-poc4b.qmu.dev → :5190` was added this session (developer-approved).
- **The guide dev server was started** (`scripts/serve-guide.sh` → container
  on host **5181** → `plgg-guide.qmu.dev`; route already in cloudflared).

Where work stopped: `main` is clean and shipped. The remaining work is the
three follow-ups below, each a live-judgment → concluding-verdict-ticket →
drive, plus a cross-repo ship.

## Policies

- `workaholic:operation` / `command-scripts` — reuse the canonical runners
  (`scripts/serve-poc.sh <name>`, `scripts/serve-guide.sh`, `/report`,
  `/ship`); no bespoke per-step scripts.
- `workaholic:implementation` / `objective-documentation` — each verdict
  records the MEASURED live-judging outcome (what was observed), not
  aspiration.
- `workaholic:design` / (portal invariant) — a concluding status must carry a
  verdict; keep `pocConsistent` and the portal specs green (as PoC 2/3 did).

## Implementation Steps

1. **Conclude PoC 4.** Re-judge the FIXED build at
   `https://plgg-poc4.qmu.dev/` (serve via `scripts/serve-poc.sh poc4-edit` —
   two-process container). Confirm the two live-judging fixes hold: an explicit
   language-switch request is honored, and an edit round-trips as clean
   markdown (the iframe reloads, the session survives). Then `/ticket` a
   concluding verdict that flips the `poc4` record in `pocs.ts` from `building`
   to a concluded status with the measured verdict, and drive it.
_(The former step 3 — "ship the workaholic `.env` branch" — is REMOVED. On
2026-07-14 it was found already done: the root-`.env` worktree copy is on
workaholic `main` via commit `8fba48f`, so branch `work-20260713-144839` is
redundant and should be DELETED, not shipped. The remaining follow-up — write
the AI-facing skill guidance for the convention — now lives as its OWN
workaholic-repo ticket
`20260714010905-document-root-env-worktree-convention-in-branching-skill.md`,
to be driven in a workaholic session, not from here.)_

## Quality Gate

- Steps 1–2: each verdict ticket records a measured live-judging outcome and
  keeps `pocConsistent` + the portal specs (`Poc.spec.ts`, `view.spec.ts`)
  green; a fresh `check-all` stays EXIT 0.

## Findings

- **PoC 4b's live "same-whiteboard feel" is the open confidence signal.** The
  mechanics are proven offline + headless; only the developer's live judgment
  of the two modes remains (that judgment IS the verdict). Do not re-verify the
  offline mechanics — they are green.
- **The two-phase erase→write animation was never rendered in a browser this
  session** (Chrome was unavailable headless) — the timing (`REVEAL_MS` in
  `packages/plgg-poc4b-coedit/src/effects.ts`) and the keyed-reconciliation
  re-trigger are the parts most likely to need tuning; fold that into the live
  judging. The animation is an isolated seam (plgg-view `transition`/`slideIn`/
  `fadeOut` + `key`), so tuning it does not touch the pure diff.
- **The deferred-concern corpus is large (93 active, all carried, none from
  this branch, no compounds).** A dedicated `/report`-style triage pass (the
  Phase 1b buckets) is worth doing sometime; it was intentionally NOT run
  mid-ship to avoid blocking the release.

## Decisions

- **PoC 4 and PoC 4b get SEPARATE concluding verdicts** (two distinct `pocs.ts`
  records): PoC 4 owns the MECHANICS question, PoC 4b the EXPERIENCE question.
  Concluding one does not conclude the other.

## Considerations

- **Uncommitted build churn on this carry branch** (`work-20260714-004258`):
  the guide container rewrote `packages/guide/package-lock.json` (libc-field
  churn — the standing `container-npm-rewrites-a-sibling-package` concern), and
  an untracked `packages/plgg-router/tsconfig.dts.json` appeared. Neither is
  this task's work — `git restore packages/guide/package-lock.json` and remove
  the stray `tsconfig.dts.json` before committing anything (this checkpoint did
  NOT touch them — capture-only).
- **Live containers started this session may still be running**: the
  `poc4b-coedit` container (host 5190), the `guide` container (host 5181), and
  a cloudflared tunnel (relaunched detached, pid was 2813094; config backup at
  `~/.cloudflared/config.yml.bak-poc4b`). `podman compose -f
  workloads/<name>/compose.yaml down` stops a workload; leave the tunnel up.
- **serve-poc.sh / serve-guide.sh source the repo-root `.env`** (caller env
  wins); the standing OPENAI_API_KEY is there.
