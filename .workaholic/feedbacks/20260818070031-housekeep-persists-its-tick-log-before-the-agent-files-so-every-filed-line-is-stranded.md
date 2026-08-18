---
type: Feedback
title: Housekeep persists its tick log before the agent files, so every -filed line is stranded
kind: concern
source: discussion
subject: observer_ai:[Housekeep] routine
created_at: 2026-08-18T07:00:31+00:00
author: a@qmu.jp
supersedes: 
---

# Housekeep persists its tick log before the agent files, so every -filed line is stranded

Measured live during housekeep tick 20260818-065217 in this repository, on a routine-fired (container) session.

`run.sh` runs `persist-log.sh` as its own closing act, immediately after the ninth step. The agent then acts on `needs_agent` and records each filing under `<step>-filed` via `log-append.sh`. Those `-filed` lines therefore land in the checkout *after* the only writer to the base has already run.

`persist-log.sh` unions **by `## <tick-id>` section heading, not by line** — "whatever `## <tick-id>` sections the base already carries are left untouched". The tick section is already on the base by the time the `-filed` lines exist, so a second `persist-log.sh --tick <same-id>` reports `already_current` and carries nothing. Measured this tick: the base copy of `.workaholic/housekeeping/2026-08-18.md` carried 9 lines for section `20260818-065217`; the checkout carried 14.

Consequence, and it compounds every hour: the `<step>-filed` lines are exactly the lines the next tick reads to answer "did an earlier tick already file this?" (`log-read.sh --step <step>-filed --contains <id>`). A routine container is discarded, so on the routine path those lines never reach the base at all — every tick re-files what the last one filed, forever, and the audit trail on the base says only what each tick *found*, never what it *did*. A hand-run never sees this: its checkout survives, so the dedup reads work locally. That is the same asymmetry `persist-log.sh` was written to close, reappearing one step later in the sequence.

Two candidate repairs, neither chosen here — this is a report, not a ruling:

1. Move the persist out of `run.sh` and make it the agent's closing act, after the `-filed` lines are written. This is the order the `/housekeep` command prompt already reads in. It costs nothing but sequencing, and it weakens one property `run.sh` has today: a tick that dies between the ninth step and the agent's filing would persist nothing, where now it persists the probe lines.
2. Make `persist-log.sh` union by *line* within an existing section rather than skipping the section whole. Strictly more correct, and it keeps repair 1's crash property — but it is a real change to the concurrency argument, since the section-level union is what makes two containers on the same day non-conflicting, and a line-level union has to stay commutative under that same race.

Recovery used this tick, recorded so the log stays readable: the four `<step>-filed` lines were re-recorded under a follow-on tick id so `persist-log.sh` would carry them as a new section. `log-read.sh` matches on step id plus substring across sections, so the dedup those lines exist for still works; only the section grouping is off by one tick.

Reported against the workaholic plugin's `skills/housekeep/` (`scripts/run.sh`, `scripts/persist-log.sh`). Filed from this repository because this is where the tick ran and where the evidence is.
