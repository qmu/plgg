---
created_at: 2026-07-04T18:50:36+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort:
commit_hash:
category:
depends_on: []
---

# CARRY CHECKPOINT — roadmap /drive: Phase 1 (tickets 01–04) done; resume at ticket 05

## Overview

Carry checkpoint, **not** implementation work. A `/drive night` pass on branch
`work-20260704-130317` implemented the first four roadmap tickets of the
plggpress/plggmatic vision; a fresh session should read this, then continue the
`/drive` from **ticket 05**. Source of truth for the whole plan:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` (decisions D1–D18,
31-ticket roadmap, per-phase gates, coordination notes).

**Done & committed (Phase 0 Groundwork + Phase 1 Design tokens):**

| Ticket | Commit | What |
|---|---|---|
| 01 cleanup-plgg-press-remnant-and-canonical-manifests | `c28807c` | rmdir remnant; manifests/prose → qmu/plgg (D13) |
| 02 harden-coverage-gate-defaults | `1302e07` | opt-out coverage gating; gate plgg-kit; 3 exemptions (D14) |
| 03 plggmatic-token-matrix-monochrome-default | `c90247f` | 25-token role×variant matrix; monochrome default (D9) |
| 04 palette-override-api-and-scheme-persistence | `02f4ff6` | HexColor/asPalette/schemeCssOf; vp-appearance contract (D9/D16) |

The roadmap-planning commit is `8e357fa`; the prior carry checkpoint was
archived in `591ec26`. Working tree is clean; a fresh `scripts/check-all.sh`
was **EXIT 0** at `02f4ff6` (0 test failures, 0 tsc errors, 18 gates passed, 3
exempt).

## Policies

- `workaholic:implementation` / `objective-documentation` — every claim here is
  verifiable against the named commits and the git tree.
- `workaholic:implementation` / `operational-planning` — a recovery checkpoint
  so a fresh session resumes the exact priority without this conversation.

## Key Files

- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — the plan. Read first.
- `.workaholic/tickets/todo/a-qmu-jp/` — 27 remaining roadmap tickets (05–31,
  minus the four archived).
- `.workaholic/tickets/archive/work-20260704-130317/` — the four archived
  tickets, each with a `## Final Report`.

## Related History

- The four Final Reports carry the design rationale and per-ticket verification.
- Ticket 04's Final Report also documents four ticket-03 regressions that were
  fixed retroactively and the verification-method lesson below.

## Implementation Steps

1. Read the roadmap spec, then `git log --oneline -8` to see the four landed
   commits.
2. Run `/drive`. Next drivable roots (deps satisfied): **05**
   (non-color design tokens; depends on 03 ✓), **06** (plgg-view Cmd/Sub
   effects; a breaking change across all Application consumers — sizeable),
   **14** (plggpress serve-mode), **15** (plgg-sql FTS5), and **31** (the
   durable-core spine, which gates 09/17/18). D3 sequencing favors finishing
   the design-system track (05 → 06 → 07 theme rewrite) to land the theme-first
   demo before the heavier data/domain tickets.
3. Honor the verification discipline below — it is the main lesson of this pass.

## Quality Gate

**Acceptance criteria**
- A fresh session resumes from this file + the spec with no dependence on the
  prior conversation.
- The remaining tickets stay valid (8 frontmatter fields, bare `depends_on`,
  edges resolve, graph acyclic).

**Verification method**
- `ls .workaholic/tickets/todo/a-qmu-jp/*.md | wc -l` → 28 (27 roadmap + this
  checkpoint).
- **Read the `"N passed, M failed"` line AND the process exit code from a
  FOREGROUND run** — see the warning below.

**Gate**
- Capture-only; the gate is simply that `/drive` finds the priority and the
  tickets are intact. No build/commit/archive is part of /carry.

## Considerations

- **VERIFICATION DISCIPLINE (hard-won this pass — do not repeat the mistakes):**
  - `plgg-test`'s `"Coverage gate passed"` line is **orthogonal** to test
    pass/fail — the gate runs on coverage data regardless of assertion results.
    The authoritative signals are the `"N passed, M failed"` line and the
    process **exit code**. Ticket 03 shipped 4 red tests that a coverage-line
    read missed.
  - This zsh shell has **`noclobber`**: `cmd > existing.log` FAILS silently and
    you end up reading a STALE log. Use `>|` or a fresh filename.
  - `pgrep -f check-all.sh` **self-matches** your own command line (it contains
    the string) → false "RUNNING". Use `ps -eo … | grep projects/plgg`.
  - Prefer FOREGROUND `check-all.sh` with the Bash-tool `timeout` raised
    (it now takes ~4–5 min); backgrounding + piping masked exit codes and gave
    false greens.
- **check-all is slower now**: ticket 02 made coverage collection unconditional
  (~263s fresh run). This is ticket 02's own recorded revisit trigger — a
  follow-up ticket may add an opt-in local `--no-coverage` escape hatch
  (default stays gated). Not yet ticketed.
- **Ticket 06 is a breaking change** to plgg-view's `Application` (update →
  `[Model, Cmd]` + Sub) touching every consumer in one branch — budget for it;
  it unblocks the scheduler (09), actions (12), and the voice agent (25).
- Sequencing is hybrid (D18): the design-system track (05–08) is unblocked; the
  durable-core spine (31) gates the data/domain tickets (09/16/17/18).
- Once `/drive` is underway on ticket 05, this checkpoint can be archived.
