---
type: Concern
mission: plggpress-technical-confidence-poc-portal
tickets: [20260711131543-resume-poc-fleet-ci-fix-and-next-tickets.md, 20260711162512-record-poc1-verdict.md, 20260711170040-poc1-cjk-tokenizer-measured.md]
origin_pr: 63
origin_pr_url: https://github.com/qmu/plgg/pull/63
origin_branch: work-20260711-125441
origin_commit: d20470d3
created_at: 2026-07-12T00:34:48+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# Corpus 'bytes' metric uses character count, not UTF-8 bytes

## Description

The corpus size metric uses string `.length` (character count), not UTF-8 bytes — a pre-existing convention shared with the English metric, so the JA payload KB understates on-disk size (see [48e9a7bf](https://github.com/qmu/plgg/commit/48e9a7bf) in `packages/plgg-poc1-search`).

## How to Fix

Document the metric as character-count-based or switch both corpora to UTF-8 byte measurement; low urgency since the relative Segmenter-vs-bigram comparison is unaffected.
