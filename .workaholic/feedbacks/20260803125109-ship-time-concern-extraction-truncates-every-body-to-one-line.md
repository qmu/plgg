---
type: Feedback
title: Ship-time concern extraction truncates every body to one line
kind: concern
source: discussion
created_at: 2026-08-03T12:51:09+00:00
author: noreply@anthropic.com
supersedes: 
---

# Ship-time concern extraction truncates every body to one line

Every deferred concern ever extracted at ship time is truncated to its first physical line. The 2026-08-03 batch read the three records from PR #98 and each one stops mid-sentence — "`issuedAtSeconds` is supplied by the caller, deliberately —", "Nothing in the library — inventing a clock check would", "Both were cut from `main` as separate PR-units, and each". The cause is `field()` in `ship/scripts/extract-deferred-concerns.sh`: its pattern ends `(.*)$` under `re.MULTILINE` without `re.DOTALL`, so `.` never crosses a newline and `$` matches at the first line end, capturing only the first line of a `**Description:**` or `**How to Fix:**` bullet. Our PR bodies hard-wrap at about 76 columns, so the cut lands mid-sentence every time. This is not new and it is not rare: all 160 records carrying an `origin_pr` — every extraction from PR #62 through PR #98, twelve PRs — have a one-line Description. The How-to-Fix guidance is destroyed at exactly the point it becomes useful, and because a feedback is immutable and the extractor skips any `concern_id` already in the stream, fixing the regex upstream will not heal a single existing record.
