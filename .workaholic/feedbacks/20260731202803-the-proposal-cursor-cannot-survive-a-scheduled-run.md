---
type: Feedback
title: The proposal cursor cannot survive a scheduled run
kind: concern
source: discussion
created_at: 2026-07-31T20:28:03+00:00
author: noreply@anthropic.com
supersedes: 
---

# The proposal cursor cannot survive a scheduled run

The same 2026-07-31 scheduled run stopped at step 2 with
`{"commit": "a9672e18", "initialized": true}` — the proposal cursor was absent,
so `cursor.sh read` bootstrapped it to the current `origin/main` tip and the
batch reported silence by contract. That is the correct cold-start behaviour,
but on this environment every start is a cold start: `.workaholic/proposal-cursor`
is runner-local state git-ignored through `.git/info/exclude`, and Claude Code
on the web clones the repository fresh into a new container on every scheduled
firing, so neither the cursor nor the exclude line survives. The safety valve
that should fire once now fires on every tick, which means a scheduled
`/propose` here can never open a proposal regardless of what the feedback stream
holds — the batch is not judging conservatively, it is never reaching the
judgment. Decision C1 assumed one persistent server runs the batch; an ephemeral
runner needs the cursor to be durable state, or the schedule needs to run
somewhere that keeps it.
