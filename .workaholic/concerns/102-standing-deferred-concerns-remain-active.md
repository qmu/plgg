---
type: Concern
mission: plggpress-technical-confidence-poc-portal
tickets: [20260711131543-resume-poc-fleet-ci-fix-and-next-tickets.md, 20260711162512-record-poc1-verdict.md, 20260711170040-poc1-cjk-tokenizer-measured.md]
origin_pr: 63
origin_pr_url: https://github.com/qmu/plgg/pull/63
origin_branch: work-20260711-125441
origin_commit: d20470d3
created_at: 2026-07-12T00:34:48+09:00
last_seen: 2026-07-12T00:34:48+09:00
first_seen: 2026-07-12T00:34:48+09:00
concern_id: 102-standing-deferred-concerns-remain-active
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# (carried from PRs #31–#62) 102 standing deferred concerns remain active

## Description

This branch touched only the two PoC packages, `scripts/npm-install.sh`, and `.workaholic` knowledge files. The 102 still-active concerns from PRs #31–#62 target plgg-web Http + Result combinators, plgg-sql, plggmatic/renderer, plggpress/auth, plgg-bundle, and plgg-parser/plgg-highlight — none of which changed here, so every flagged pattern is untouched. See the roll-forward indices `.workaholic/concerns/61-89-standing-deferred-concerns-carried-prs.md` and `.workaholic/concerns/62-97-standing-deferred-concerns-carried-prs.md`.

## How to Fix

Address them as their target areas are worked on in future PRs; they carry forward unchanged.
