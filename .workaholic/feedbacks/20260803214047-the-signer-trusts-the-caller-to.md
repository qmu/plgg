---
type: Feedback
title: The signer trusts the caller to pass every header that will be sent
kind: concern
source: development
created_at: 2026-08-03T21:40:47+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: the-signer-trusts-the-caller-to
owner: 
mission: []
tickets: [20260722120000-plgg-fetch-aws-sigv4-signing.md]
origin_pr: 97
origin_pr_url: https://github.com/qmu/plgg/pull/97
origin_branch: work-20260801-184834
origin_commit: 35e471b6
last_seen: 2026-08-03T21:40:47+09:00
---

# The signer trusts the caller to pass every header that will be sent

## Description

`sigv4Sign` synthesizes nothing — not `host`, not

## How to Fix

A `sigv4Request(...)` builder that takes the URL plus the
