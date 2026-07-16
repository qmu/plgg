---
created_at: 2026-07-16T12:52:35+09:00
author: a@qmu.jp
type: housekeeping
layer: [UX]
effort: 0.5h
commit_hash:
category: Changed
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# Conclude PoC 5: flip the `poc5` record to `proven` with the developer's live verdict

## Overview

PoC 5 ("Central configuration generation") was **approved by the developer on
2026-07-16** after live review at `plgg-poc5.qmu.dev` (route applied and tunnel
validated 2026-07-16; the app serves its real shell). Its `pocs.ts` record is
still `status: "building"` with `verdict: none()` — the build ticket
(`20260714021940`, archived) deliberately left the verdict to a separate
concluding ticket, which is this one, exactly as PoC 2 / 3 / 4 / 4b were
concluded.

This is a **record-only change**: the `poc5` entry in `pocs.ts` (status +
verdict). No PoC 5 package code changes.

## The verdict's factual basis (do not overclaim)

The developer's live judgment was a plain approval ("approve poc 5/6") — no
specific observations were dictated, so the verdict text records the approval
plus what the build measurably demonstrates (from the archived build ticket and
`packages/plgg-poc5-config/README.md`):

- The typed command path (`tag` / `exclude` / `include` / `theme` / `layout`)
  parses each line to exactly one `ConfigOp`, applied by the one total
  `applyOp` into the single typed `Config`; the sample site re-renders live —
  recolored/badged tag chips, hidden excluded paths, a re-laid-out, re-sized
  grid.
- Seven `sz-` sizing themes and three layouts are closed unions rendered by
  exhaustive `switch` — inside the signal's "~5–10 sizing themes" band.
- The Realtime voice session is the bonus second way in, calling the same five
  tools (`set_tag`, `exclude_path`, `include_path`, `set_sizing_theme`,
  `set_layout`).
- Accepted sacrificial bound, stated at build time: the configuration is client
  state the sample site renders live — no disk-persistence seam; production
  plggpress owns where generated config durably lives.

## Policies

- `workaholic:implementation` / `objective-documentation` — record the
  developer's approval and the measured build facts; do not fabricate specific
  live observations that were not stated.
- Portal invariant — a concluding status MUST carry a verdict; keep
  `pocConsistent` green.

## Key Files

- `packages/plgg-poc-portal/src/pocs.ts` — the `poc5` record: flip
  `status: "building"` → `"proven"`, `verdict: none()` → `some(...)`.
- `packages/plgg-poc-portal/src/Poc.spec.ts`, `view.spec.ts` — must stay green.

## Implementation Steps

1. Edit the `poc5` record in `pocs.ts` per the factual basis above.
2. Portal specs green (`pocConsistent` satisfied, coverage >90%).
3. `scripts/tsc-plgg.sh` clean; Prettier printWidth 50; fresh
   `scripts/check-all.sh` EXIT 0.

## Quality Gate

- The `poc5` record reads `proven` with a verdict stating only the approval and
  measured build facts; portal specs green; fresh `check-all` EXIT 0; no
  `as`/`any`/`ts-ignore`.
