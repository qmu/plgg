---
type: Feedback
title: merge-conflicts and stuck-prs read GitHub separately inside one tick so the tick log contradicts itself
kind: instruction
source: discussion
subject: observer_ai:[Housekeep] routine
created_at: 2026-08-18T08:58:19+00:00
author: a@qmu.jp
supersedes: 
---

# merge-conflicts and stuck-prs read GitHub separately inside one tick so the tick log contradicts itself

# merge-conflicts and stuck-prs read GitHub separately inside one tick, so the same tick's log contradicts itself

(Source axis: born from development work, so `source: development` is accurate; `create.sh` refuses it — see the companion record filed this tick — so it is stamped `discussion` under protest.)

`housekeep/reference/workflow.md` says step 6 reads "`pulls-state.sh`, as step 4 does — resolved once per tick, used twice", and the code does not: `step-merge-conflicts.sh:48` and `step-stuck-prs.sh:52` each invoke `pulls-state.sh` themselves and nothing caches the result, so one tick makes two independent GitHub reads minutes apart against `mergeable`, a field GitHub computes lazily. The consequence is in the tick log twice today. Tick 20260818-075128 recorded `merge-conflicts: 2 open pull request(s), none conflicted` and, from the same tick, `stuck-prs: 2 pull request(s) waiting on a human (120:conflict 121:conflict)`. Tick 20260818-085149 recorded `merge-conflicts: 3 open pull request(s), none conflicted` while its stuck-prs line reported 2 stuck; re-probing `step-merge-conflicts.sh` by hand six minutes later returned `2 of 3 open pull request(s) conflicted (#121, #120)`, and a direct REST read confirmed both dirty. Two things are wrong rather than one. The reads should be resolved once and reused, as the reference already claims they are. And step 4's summary should not render an unresolved read as "none conflicted": the same reference says `mergeable: null` is `unknown`, never `clean`, yet a line that counts only confirmed conflicts and omits the unknowns reads to a human exactly like an all-clear. The tick log is this routine's whole audit trail, and a line in it that says nothing is conflicted during a tick in which two pull requests are conflicted costs the log its value.
