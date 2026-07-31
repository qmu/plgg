---
type: Feedback
title: The proposal cursor resets when the container is reclaimed
kind: concern
source: discussion
created_at: 2026-07-31T20:31:23+00:00
author: noreply@anthropic.com
supersedes: 
---

# The proposal cursor resets when the container is reclaimed

The 2026-07-31 scheduled `/propose` run bootstrapped its cursor
(`{"commit": "a9672e18", "initialized": true}`) and stopped at step 2 by
contract. The next firing, minutes later on the same container, read
`initialized: false` and ran the window normally — so the first reading, that
the cursor never survives here, was wrong, and the true shape is worse for being
intermittent. `.workaholic/proposal-cursor` is runner-local state git-ignored
through `.git/info/exclude`, and Claude Code on the web reclaims the container
after a period of inactivity or when the session ends: the cursor survives
consecutive firings inside one container's life, then is silently reset to the
then-current tip on the next cold start. Every reclaim therefore burns one firing
on bootstrap-silence and, because the bootstrap treats everything already on
`main` as seen, permanently skips whatever feedback landed between the last
firing and that cold start. Decision C1 assumed one persistent server runs the
batch; nothing reports when that assumption lapses.
