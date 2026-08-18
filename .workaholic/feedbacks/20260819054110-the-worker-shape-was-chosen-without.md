---
type: Feedback
title: The Worker shape was chosen without reading the named reference
kind: concern
source: development
subject: observer_ai:a@qmu.jp
created_at: 2026-08-19T05:41:10+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: the-worker-shape-was-chosen-without
owner: a@qmu.jp
mission: [deliver-the-guide-from-cloudflare-workers-with-a-staging-surface]
tickets: []
origin_pr: 123
origin_pr_url: https://github.com/qmu/plgg/pull/123
origin_branch: work-20260818-073433
origin_commit: 934da154
last_seen: 2026-08-19T05:41:10+09:00
---

# The Worker shape was chosen without reading the named reference

## Description

the instruction named `qmu-co-jp`'s `packages/site` as the reference; this session's GitHub access is scoped to `qmu/plgg` and the read was refused, so Static Assets was chosen on its merits rather than mirrored (see [e7d5c837](https://github.com/qmu/plgg/commit/e7d5c837) in `packages/guide/wrangler.jsonc`)

## How to Fix

open the reference and converge if it differs — a config-level change, not a rewrite
