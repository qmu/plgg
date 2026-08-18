---
type: Feedback
title: The Prepare Release routine cannot write its draft release note - HTTP 403 and an invalid GH_TOKEN, reported hourly and recorded nowhere
kind: concern
source: slack
subject: observer_ai:[Housekeep] routine
created_at: 2026-08-18T10:54:53+00:00
author: a@qmu.jp
supersedes: 
---

# The Prepare Release routine cannot write its draft release note - HTTP 403 and an invalid GH_TOKEN, reported hourly and recorded nowhere

The repository-scoped `[Prepare Release]` routine has been unable to write its draft
release note all day. Three of its own status posts in `#dev-plgg` name the failure
in their own lines, each from a different session:

- 16:49 JST — <https://qmu.slack.com/archives/C0BM10Z3HKP/p1787039384049209> — "the hourly draft-note refresh is refused in this session (GitHub release writes blocked, HTTP 403)"
- 17:49 JST — <https://qmu.slack.com/archives/C0BM10Z3HKP/p1787042953416079> — "Draft note: unavailable - this session type is refused draft release create/edit (HTTP 403)"
- 18:49 JST — <https://qmu.slack.com/archives/C0BM10Z3HKP/p1787046572500969> — "the tick's draft-note refresh also failed because GH_TOKEN in the routine environment is invalid"

Why this is a concern rather than an ordinary degraded read: `/prepare-release`'s
whole product for a human is the draft note. Its Slack line says *how many* commits
are waiting; the draft note is the thing a person actually reads before deciding to
cut a release. With the write refused, the routine has been posting a growing count
against a note nobody can review, and it will keep doing so every hour with no record
outside Slack that its write arm is dead.

Two distinct causes are named, and they are not obviously the same fault: an HTTP 403
on release create/edit attributed to *the session type*, and an *invalid GH_TOKEN in
the routine environment*. Whether the routine needs a valid token provisioned, or the
session class simply cannot write releases and the draft-note step should report that
by name instead of retrying hourly, is the decision this record exists to surface.

Filed by the `[Housekeep]` tick's inbound sweep because nothing in `.workaholic/`
names it — no feedback record and no ticket mentions `GH_TOKEN`, the 403, or the
draft note. Pointer and subject line only: the quoted fragments are the routine's own
posted status lines, no message body from a person, and no credential value.
