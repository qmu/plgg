---
created_at: 2026-06-30T01:35:11+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260630013502-plgg-md-inline-fold-to-html.md, 20260630013503-plgg-highlight-ts-scanner.md, 20260630013507-plgg-press-checklinks-anchor-aware.md, 20260630013508-plgg-press-dev-server-live-reload.md]
---

# Wire plgg-md + plgg-highlight + plgg-press into scripts/build.sh and check-all.sh with per-package test runners

## Overview

The canonical local gate enumerates packages by hand: scripts/build.sh builds dists in dependency order and scripts/check-all.sh runs per-package test runners. Add plgg-md, plgg-highlight, AND plgg-press to the build order and create scripts/test-plgg-md.sh + scripts/test-plgg-highlight.sh + scripts/test-plgg-press.sh, listing them in check-all.sh, so the new packages' tsc/test/>90%-coverage run in the gate and the file:-link build order is defined. Without this, the new packages never run in CI/local checks.

**Proof of value:** scripts/check-all.sh runs tsc + tests + >90% coverage for plgg-md, plgg-highlight, and plgg-press (via the new runners) and scripts/build.sh produces their dists in dependency order — all green.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — runner scripts live in scripts/ following the existing test-plgg-*.sh pattern
- `workaholic:implementation` / `policies/coding-standards.md` — the new runner scripts mirror the existing test-plgg-*.sh conventions (sh -eu, same invocation shape)
- `workaholic:implementation` / `policies/command-scripts.md` — consolidate into the canonical runner pattern rather than bespoke one-offs
- `workaholic:implementation` / `policies/test.md` — >90% coverage must be enforced for the new packages via the runners
- `workaholic:operation` / `policies/ci-cd.md` — the gate runners feed the run-tests CI path

## Key Files

- `/home/ec2-user/projects/plgg/scripts/build.sh` - dependency-ordered dist build; insert plgg-md (after plgg-view) then plgg-highlight (after plgg-md) then plgg-press (after plgg-highlight + plgg-server)
- `/home/ec2-user/projects/plgg/scripts/check-all.sh` - per-package runner list; add the three new test runners
- `/home/ec2-user/projects/plgg/scripts/test-plgg-view.sh` - reference test/coverage runner shape (tsc --noEmit && plgg-test src) the new runners mirror

## Dependencies

- Depends on [20260630013502-plgg-md-inline-fold-to-html.md](20260630013502-plgg-md-inline-fold-to-html.md) — plgg-md: inline parser, injected Highlighter + link-resolver seams, anchor-parity slugs, AST->Html<never> fold
- Depends on [20260630013503-plgg-highlight-ts-scanner.md](20260630013503-plgg-highlight-ts-scanner.md) — Create plgg-highlight: zero-dep TS/TSX syntax highlighting via ts.createScanner
- Depends on [20260630013507-plgg-press-checklinks-anchor-aware.md](20260630013507-plgg-press-checklinks-anchor-aware.md) — plgg-press checkLinks: anchor-aware build-time dead-link validation
- Depends on [20260630013508-plgg-press-dev-server-live-reload.md](20260630013508-plgg-press-dev-server-live-reload.md) — plgg-press dev(): node:http + fs.watch rebuild, Host allowlist, and DEV-ONLY SSE live-reload

## Implementation Steps

1. Add plgg-md (after plgg-view), plgg-highlight (after plgg-md), and plgg-press (after plgg-highlight and after plgg-server, since plgg-press depends on plgg-server/plgg-http) to scripts/build.sh's dependency-ordered dist build.
2. Create scripts/test-plgg-md.sh, scripts/test-plgg-highlight.sh, and scripts/test-plgg-press.sh mirroring an existing scripts/test-plgg-view.sh (tsc + plgg-test + coverage).
3. List the three new runners in scripts/check-all.sh.
4. Confirm coverage thresholds (>90%) are configured for the new packages (mirroring the plgg coverage config).
5. Run scripts/check-all.sh and confirm the new packages' tsc/test/coverage execute and pass.

## Considerations

- Build order: plgg-highlight depends on plgg-md; plgg-press depends on plgg-md, plgg-highlight, plgg-view, plgg-server, plgg-http — it must be built after all of them.
- MEMORY mandates >90% coverage; the runners must enforce it, not just run tests.
- This is local-gate wiring; the deploy workflow build loop is handled in ticket 16.
