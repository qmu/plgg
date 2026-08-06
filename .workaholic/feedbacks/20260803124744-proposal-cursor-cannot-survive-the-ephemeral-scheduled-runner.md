---
type: Feedback
title: Proposal cursor cannot survive the ephemeral scheduled runner
kind: concern
source: discussion
created_at: 2026-08-03T12:47:44+00:00
author: noreply@anthropic.com
supersedes: 
---

# Proposal cursor cannot survive the ephemeral scheduled runner

The scheduled proposal batch ran on 2026-08-03 and stopped at step 2 with `{"commit": "4739b802955937b881bf4321aa73681dd16ae7ed", "initialized": true}` — a cold-start bootstrap, not a survey. The cursor lives at `.workaholic/proposal-cursor`, which `cursor.sh` git-ignores through `.git/info/exclude`, so it is runner-local state by design (decision C1: one server runs the batch). This repository's batch, though, is fired by a Claude Code scheduled task in a remote container that clones the repository fresh on every start and is reclaimed after inactivity, so nothing survives between ticks. The cursor is re-bootstrapped to the current `origin/main` HEAD every run, `read` reports `initialized: true`, and the batch stops — which means every feedback record written since the previous tick sits behind the new cursor and is counted as already-seen. From this runner the batch can never open a proposal, and it fails silently: each tick looks like a healthy quiet run. Either the cursor needs a home that survives the container, or the batch needs to run somewhere persistent.
