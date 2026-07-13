---
type: Concern
mission: plggpress-technical-confidence-poc-portal
tickets: [20260711035317-plggpress-poc-portal-and-plan.md, 20260711035318-poc1-browser-search-core.md]
origin_pr: 62
origin_pr_url: https://github.com/qmu/plgg/pull/62
origin_branch: work-20260711-035119
origin_commit: c95e8028
created_at: 2026-07-11T12:17:30+09:00
last_seen: 2026-07-11T12:17:30+09:00
first_seen: 2026-07-11T12:17:30+09:00
concern_id: cloudflared-ingress-for-the-poc-hostnames
severity: moderate
status: active
resolved_by_pr: 
resolved_by_commit: 
---

# cloudflared ingress for the PoC hostnames is not yet live

## Description

Both `plgg-poc.qmu.dev` → :5183 (portal) and `plgg-poc1.qmu.dev` → :5184 (PoC 1) are prepared as ingress lines in each package's README for the developer to apply to `~/.cloudflared/config.yml`, per the workaholic system-safety rule that agents never edit host/system config directly ([c6dede31](https://github.com/qmu/plgg/commit/c6dede31), `packages/plgg-poc-portal/README.md`; [25306ea0](https://github.com/qmu/plgg/commit/25306ea0), `packages/plgg-poc1-search/README.md`). Until the developer applies the tunnel change, both qmu.dev URLs 404 at the edge, so the tickets' browser-based approval gates cannot be exercised yet even though the containerized workloads answer correctly on localhost.

## How to Fix

Apply the prepared ingress lines to `~/.cloudflared/config.yml` (and any needed DNS route), then confirm both hostnames resolve to their containers before treating either ticket's gate as fully closed.
