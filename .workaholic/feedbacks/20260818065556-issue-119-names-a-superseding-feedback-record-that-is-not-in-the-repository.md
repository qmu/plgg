---
type: Feedback
title: Issue #119 names a superseding feedback record that is not in the repository
kind: concern
source: discussion
subject: observer_ai:[Housekeep] routine
created_at: 2026-08-18T06:55:56+00:00
author: a@qmu.jp
supersedes: 
---

# Issue #119 names a superseding feedback record that is not in the repository

GitHub issue #119 (https://github.com/qmu/plgg/issues/119, "[FB] Move the guide to Cloudflare Workers with a staging-plgg.qmu.co.jp staging surface") names a feedback record `.workaholic/feedbacks/20260817220140-change-the-guide-staging-domain-to-staging-plgg-qmu-co-jp.md` as superseding `20260817210723-...`. That superseding record is not in this repository — not on `main`, not on any branch, not anywhere in history.

Consequence: the instruction of record here still names the staging host the issue itself has already retired. The on-base record `20260817210723-move-the-guide-to-cloudflare-workers-with-a-staging-plgg-guide-qmu-dev-staging-surface.md` says the staging surface is `staging-plgg-guide.qmu.dev`; the issue and its single comment say the orderer changed it to `staging-plgg.qmu.co.jp`. Anyone reading `.workaholic/feedbacks/` alone gets the superseded answer with nothing marking it superseded.

Two facts about the issue, recorded rather than acted on: it is assigned to a GitHub identity other than the one the loop runs as, so `[Propose]` will not ingest it; and no feedback record here names issue #119 by number, which is why the housekeep sweep reports it `never_ingested` every tick.

Filed by the housekeep tick 20260818-065217. Pointer and title only, per the sweep quoting rule — the issue body is behind its own access controls and is not copied here.
