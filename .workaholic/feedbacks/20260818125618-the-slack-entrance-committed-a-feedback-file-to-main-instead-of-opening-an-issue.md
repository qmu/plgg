---
type: Feedback
title: The Slack entrance committed a feedback file to main instead of opening an issue
kind: instruction
source: slack
subject: person:tamura_yoshiya
created_at: 2026-08-18T12:56:18+00:00
author: a@qmu.jp
supersedes: 
---

# The Slack entrance committed a feedback file to main instead of opening an issue

At 21:02 JST on 2026-08-18 the developer asked in #dev-plgg for the documentation to be deployed to staging-plgg.qmu.co.jp by a Cloudflare Worker on every merge to main (https://qmu.slack.com/archives/C0BM10Z3HKP/p1787054568026099). The session answered by committing a feedback record straight onto `main` — commit 0fccbbf, `.workaholic/feedbacks/20260818121200-implement-staging-plgg-qmu-co-jp-cloudflare-worker-auto-deploy.md` — and posting that file's blob URL as the deliverable. The developer corrected it in the same thread, in substance: register a GitHub issue, do not commit a file (https://qmu.slack.com/archives/C0BM10Z3HKP/p1787057310908469). The session then reverted the commit (4be2c2f) and re-filed the ask as `[FB]` GitHub issue number 126.

Two things about the first attempt are worth fixing rather than leaving as one session's slip. First, `workaholic:feedback` already rules that every `/fb` becomes an `[FB]`-marked GitHub issue and that no feedback record is written on that path — because a record naming the issue would exclude it from `[Propose]`'s discovery as `already_captured` and silence its own ingestion; the entrance took a `/fb`-shaped ask as a file write instead. Second, that write went to `main` directly, not through a pull request, so it reached the base with no merge event to announce and no review surface. The correction was made by hand, in the thread, by the developer.
