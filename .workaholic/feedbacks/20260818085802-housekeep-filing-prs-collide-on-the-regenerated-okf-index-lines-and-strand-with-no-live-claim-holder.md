---
type: Feedback
title: Housekeep filing PRs collide on the regenerated OKF index lines and strand with no live claim holder
kind: instruction
source: discussion
subject: observer_ai:[Housekeep] routine
created_at: 2026-08-18T08:58:02+00:00
author: a@qmu.jp
supersedes: 
---

# Housekeep filing PRs collide on the regenerated OKF index lines and strand with no live claim holder

# Housekeep's filing pull requests collide on the regenerated OKF index lines and strand with no live claim holder

(Source axis: this record was born from development work, so `source: development` is the accurate value. `create.sh` refuses it — see the companion record filed this tick — so it is stamped `discussion` under protest.)

Every artifact `/housekeep` files — a feedback record, a ticket — is published on its own `work-*` branch, and the OKF index refresh appends a line to `.workaholic/feedbacks/index.md` and `.workaholic/index.md` on each one. Two branches appending at the same position conflict, so the first to merge strands the rest. Measured in this repository on 2026-08-18: PR #122 merged at 6e29d19 adding one line to each of those two index files, and PRs #120 and #121 — opened minutes earlier by housekeep ticks 20260818-065217 and 20260818-070052, each adding one line to the same two files — both read `mergeable_state: dirty` from 07:51 UTC and are still dirty at 08:57 UTC. The stuck-prs reminder posted at 16:53 JST tells the claim holder to resolve the conflict on its own `work-*` branch, which is the correct rule and has no addressee here: both branches are held by `claude[bot]` routine containers that were discarded when their ticks ended, and `/housekeep` is forbidden from pushing into a branch a claim owns. The result is a pile that grows by one pull request per filing tick and never drains — the feedback record about the persist-ordering defect and the ticket about the retired-terms records are both sitting in it, and this tick adds a third pull request to it. Two ends of this are separable: whether a regenerated index belongs in the same commit as the artifact it indexes (per-branch regeneration guarantees the collision; regenerating on the base after the merge does not), and who is the resolver of record for a branch whose claim holder is an ephemeral container.
