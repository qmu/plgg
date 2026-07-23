---
type: Concern
origin_pr: 52
origin_pr_url: https://github.com/qmu/plgg/pull/52
origin_branch: work-20260703-020116
origin_commit: e859e23
created_at: 2026-07-03T04:11:11+09:00
last_seen: 2026-07-06T11:33:41+09:00
first_seen: 2026-07-03T04:11:11+09:00
concern_id: https-enforcement-and-proxied-mode-follow
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# HTTPS enforcement and proxied-mode follow-ups for plgg.qmu.co.jp

## Description

`PUT /pages` with a cname silently reset `https_enforced` to false; it must be re-enabled once GitHub issues the certificate (post-ship step). The Cloudflare record stays DNS-only until then; flipping to proxied later is optional (see [f5d8889](https://github.com/qmu/plgg/commit/f5d8889) in `.workaholic/deployments/guide.md`)

## How to Fix

After the cert issues: `gh api -X PUT repos/qmu/plgg/pages -F https_enforced=true`; record it in the deployment contract; only then consider the orange-cloud flip
