---
type: Feedback
title: Policy bodies are not checked against their attached subject
kind: concern
source: development
created_at: 2026-07-12T11:39:12+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: policy-bodies-are-not-checked-against
owner: 
mission: 
tickets: []
origin_pr: 65
origin_pr_url: https://github.com/qmu/plgg/pull/65
origin_branch: work-20260712-003839
origin_commit: 1696ae90
last_seen: 2026-07-12T11:39:12+09:00
---

# Policy bodies are not checked against their attached subject

## Description

A policy's `allows` condition is type-checked once over the actor plus every declared entity, but the use site (`authorized-by`, `authorize`, `access`) only verifies the policy exists. A policy written over `project.*` attached to entity `client` compiles; the mismatch surfaces only at consumer interpretation time (see [8f3c63d1](https://github.com/qmu/plgg/commit/8f3c63d1) in `packages/plgg-ir-manifest`).

## How to Fix

Record each policy's referenced entity roots during checking and verify at every use site that the attached subject is among them (or reachable from them).
