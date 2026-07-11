---
type: Concern
mission: plggpress-technical-confidence-poc-portal
tickets: [20260711035317-plggpress-poc-portal-and-plan.md, 20260711035318-poc1-browser-search-core.md]
origin_pr: 62
origin_pr_url: https://github.com/qmu/plgg/pull/62
origin_branch: work-20260711-035119
origin_commit: c95e8028
created_at: 2026-07-11T12:17:30+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# 97 standing deferred concerns carried (PRs 31–61)

## Description

The deferred-concern judge re-evaluated 97 previously-deferred concerns spanning PRs 31 through 61 (plgg-http/plgg core matching and dist-rebuild, plgg-server/plgg-fetch vendoring, plgg-view renderer runtime, proc Defect channel, monorepo versioning, deploy-guide CI and plgg-bundle export/minify, plgg-db-migration, dependabot/happy-dom scoping, guide Pages HTTPS ops, plggpress facade disambiguation, plgg-parser/plgg-highlight design, and plgg-cms/plgg-ui/plggmatic demo and registry concerns). All 97 were judged `still_active` and zero were resolvable by this branch: work-20260711-035119 is purely additive (two new private PoC packages, a mission, tickets, workload compose files, and README/check-all wiring) and its `git diff main..HEAD` touches none of the core packages or domains those concerns target.

## How to Fix

No action from this branch. Continue carrying these forward; see `.workaholic/concerns/` for the individual entries, and resolve each the next time a change actually lands in its target domain (plgg-http, plgg-server, plgg-view, plgg-bundle, plgg-db-migration, etc.).
