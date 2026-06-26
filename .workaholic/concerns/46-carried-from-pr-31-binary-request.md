---
origin_pr: 46
origin_pr_url: https://github.com/qmu/plgg/pull/46
origin_branch: work-20260624-135934
origin_commit: c4dc8f1
created_at: 2026-06-26T21:43:57+09:00
severity: moderate
status: active
resolved_by_pr:
resolved_by_commit:
---

# (carried from PR #31) Binary request support adds a parallel bytes field

## Description

HttpRequest still carries a parallel `bytes: Option<Uint8Array>` field (`packages/plgg-http/src/Http/model/HttpRequest.ts:26`); the test-framework migration did not touch the request model.

## How to Fix

Reconcile whether the parallel bytes field is necessary or a vestigial design; if vestigial, remove it; if necessary, document the HTTP contract and request-handling path that justifies it.
