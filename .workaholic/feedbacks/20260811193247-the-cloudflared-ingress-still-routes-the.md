---
type: Feedback
title: The cloudflared ingress still routes the deleted PoC hosts
kind: concern
source: development
created_at: 2026-08-11T19:32:47+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: the-cloudflared-ingress-still-routes-the
owner: 
mission: []
tickets: [20260806211627-remove-the-poc-fleet-packages.md, 20260806211628-untrack-stale-lockfiles-and-fix-dependabot-config.md]
origin_pr: 111
origin_pr_url: https://github.com/qmu/plgg/pull/111
origin_branch: work-20260807-001644
origin_commit: 34da750a
last_seen: 2026-08-11T19:32:47+09:00
---

# The cloudflared ingress still routes the deleted PoC hosts

## Description

Nine `plgg-poc*.qmu.dev` hostnames remain in `~/.cloudflared/config.yml` pointing at local ports nothing listens on. That file is server configuration outside this repository, so it was deliberately left alone rather than mixed into a code change's acceptance (see [3300c72b](https://github.com/qmu/plgg/commit/3300c72b)).

## How to Fix

Remove the nine ingress rules and their DNS routes on the server, at whatever moment suits the operator; nothing breaks while they linger beyond returning a connection error.
