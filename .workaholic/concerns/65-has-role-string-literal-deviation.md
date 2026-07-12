---
type: Concern
origin_pr: 65
origin_pr_url: https://github.com/qmu/plgg/pull/65
origin_branch: work-20260712-003839
origin_commit: 1696ae90
created_at: 2026-07-12T11:39:12+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# has-role takes a string literal, deviating from design §10

## Description

Design §10 sketches `(has-role actor project-manager)` with a bare symbol; the implementation requires `(has-role actor "project-manager")` because bare role symbols are unresolvable names under the closed-vocabulary checker. LLM prompt vocabularies must teach the string form (see [8f3c63d1](https://github.com/qmu/plgg/commit/8f3c63d1), documented in `docs/plgg-ir/guide.md`).

## How to Fix

Keep the string form and note it in prompt templates, or add a role nominal-literal convention (like parameters' name-is-type) in a later phase and migrate.
