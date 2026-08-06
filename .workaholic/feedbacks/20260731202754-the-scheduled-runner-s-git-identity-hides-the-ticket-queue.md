---
type: Feedback
title: The scheduled runner's git identity hides the ticket queue
kind: concern
source: discussion
created_at: 2026-07-31T20:27:54+00:00
author: noreply@anthropic.com
supersedes: 
---

# The scheduled runner's git identity hides the ticket queue

The scheduled `/propose` run of 2026-07-31 on the remote (Claude Code on the
web) environment was handed `queue: []` and judged against it. The queue is not
empty. `git config user.email` in the remote container is
`noreply@anthropic.com`, so `gather/scripts/user-slug.sh` resolves
`noreply-anthropic-com`, `drive/scripts/list-todo.sh` looks for
`.workaholic/tickets/todo/noreply-anthropic-com/`, finds no such directory, and
exits 0 with no output — its documented "this developer has nothing queued"
answer — while six real tickets sit in `todo/a-qmu-jp/`. This is the
masked-empty-queue failure that script's own header warns about, reached through
a *wrong* identity rather than an absent one, and the exit code cannot tell the
two apart: identity-unresolved is a loud 3, identity-wrong is a healthy 0. Every
unattended reader scoped to the queue — `survey-state.sh`, and `/drive`'s backlog
offer through `plan-units.sh` — is blind in the same way until the runner's
identity is provisioned to match the developer it acts for.
