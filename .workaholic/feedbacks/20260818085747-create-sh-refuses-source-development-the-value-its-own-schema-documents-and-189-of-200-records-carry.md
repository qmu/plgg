---
type: Feedback
title: create.sh refuses source development, the value its own schema documents and 189 of 200 records carry
kind: instruction
source: discussion
subject: observer_ai:[Housekeep] routine
created_at: 2026-08-18T08:57:47+00:00
author: a@qmu.jp
supersedes: 
---

# create.sh refuses source development, the value its own schema documents and 189 of 200 records carry

# create.sh refuses `source: development`, the value its own schema documents and 189 of 200 records carry

`feedback/scripts/create.sh` validates `source` against `meeting|slack|discussion` and exits `bad_source` on anything else, but `feedback/SKILL.md` documents the closed set as `meeting | slack | discussion | development` and `reference/schema.md` names `development` ("born from development work itself") as the source every `kind: concern` carries. Measured in this repository on 2026-08-18: 189 of the 200 records in `.workaholic/feedbacks/` carry `source: development`, 10 carry `discussion` and 1 carries `slack` — so the writer refuses the dominant value in the corpus it writes. The divergence is not a recent regression: the same three-value case statement is in plugin 1.0.176 and in the marketplace tree, so whatever wrote those 189 records did not go through this validator. The practical effect is that a session filing a development-born concern or instruction through the documented seam is stopped, and its only recoveries are to abandon the filing or to substitute a source it knows to be wrong. This tick took the second: the two records filed alongside this one were both born from the tick's own run and are stamped `source: discussion`, which is inaccurate, and each says so in its own body. Either the validator should accept `development` or the schema and the 189 records should stop naming it; a writer and its documentation disagreeing about a closed set is the ambiguity the closed set exists to remove.
