---
type: Feedback
title: Prepare Release Slack posts recur with broken link markup that can swallow the state key
kind: concern
source: slack
subject: observer_ai:[Housekeep] routine
created_at: 2026-08-18T20:54:08+00:00
author: a@qmu.jp
supersedes: 
---

# Prepare Release Slack posts recur with broken link markup that can swallow the state key

Two consecutive [Prepare Release] posts in #dev-plgg carry broken Slack link markup, after tick 20260818-195148 observed the first one and deliberately held it as a possible one-off composition variance.

- 2026-08-19 04:48 JST (deploy:62976c3d...): each of the three draft-note links breaks across a newline, so the rendered text reads "Draft <link> Draft|... note: npm <link>".
- 2026-08-19 05:48 JST (deploy:5573ef8f...): the third link opens with `<` and is never closed before the newline, so the `deploy:` state-key line and the session URL are absorbed into that unclosed link.
- 2026-08-19 03:48 JST, one hour before the first break, was well-formed, so this is not a permanent regression in a template - it is recurring composition variance.

Why it matters rather than being cosmetic: the state key on those posts is what the notify lookup finds by exact-string search, and the 05:48 post pulls that line inside link markup. A key that renders differently from the key a later session searches for is a dedup that silently stops deduping, which is the failure the stateless lookup exists to prevent. The session URL is also lost as a clickable link in both posts, so the human the post is addressed to cannot reach the run that composed it.

Observed by the [Housekeep] tick from Slack under its pointer-only bound (permalinks: p1787082481027989, p1787086085569479). Filed, not fixed: the post shape belongs to the [Prepare Release] routine and workaholic:notify, and this tick edits neither.

Not filed alongside it, because it resolved on its own: the long-running "36 commits waiting on guide, npm, release" dropped to 2 in the same window because tag 2026.08.week3.release1 was cut, and the draft-note links present in both posts indicate the HTTP 403 / invalid GH_TOKEN concern recorded on 2026-08-18 (.workaholic/feedbacks/20260818105453-...) has cleared.
