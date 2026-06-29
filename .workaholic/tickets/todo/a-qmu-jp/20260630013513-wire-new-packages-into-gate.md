---
created_at: 2026-06-30T01:35:13+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260630013502-plgg-md-inline-fold-to-html.md, 20260630013503-plgg-highlight-ts-scanner.md, 20260630013508-plgg-press-checklinks-anchor-aware.md, 20260630013509-plgg-press-dev-server-live-reload.md]
---

# Wire plgg-md + plgg-highlight + plgg-press into scripts/build.sh (exact ordering) and check-all.sh with per-package test + coverage runners

## Overview

The canonical LOCAL gate enumerates packages by hand: scripts/build.sh builds dists in dependency order and scripts/check-all.sh runs per-package test runners then is the authoritative local gate. Add plgg-md, plgg-highlight, AND plgg-press to scripts/build.sh at the EXACT positions (plgg-md after plgg-view; plgg-highlight after plgg-md; plgg-press after plgg-server AND plgg-http), create scripts/test-plgg-md.sh + test-plgg-highlight.sh + test-plgg-press.sh (running `npm run test`) and matching coverage runners (`npm run coverage`), and list them in check-all.sh. Each new package ships its own plgg-test.config.json with >90% thresholds (per repo memory). NOTE on CI: run-tests.yml today only runs plgg's tsc/test/coverage in CI and gate-vite.sh; it does NOT run check-all.sh — so scripts/check-all.sh is the AUTHORITATIVE LOCAL gate for the new packages' coverage. This ticket also CREATES the scripts/test-plgg-*.sh runners that earlier tickets' proofs referenced.

**Proof of value:** scripts/check-all.sh runs tsc + `npm run test` + `npm run coverage` (>90%) for plgg-md, plgg-highlight, and plgg-press via the new runners, and scripts/build.sh produces their dists with plgg-md after plgg-view / plgg-highlight after plgg-md / plgg-press after plgg-server+plgg-http — all green.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — runner scripts live in scripts/ following the existing test-plgg-*.sh pattern
- `workaholic:implementation` / `policies/coding-standards.md` — the new runner scripts mirror the existing test-plgg-*.sh conventions (sh -eu, same invocation shape)
- `workaholic:implementation` / `policies/command-scripts.md` — consolidate into the canonical runner pattern rather than bespoke one-offs
- `workaholic:implementation` / `policies/test.md` — >90% coverage must be enforced for the new packages via per-package plgg-test.config.json + coverage runners
- `workaholic:operation` / `policies/ci-cd.md` — the gate runners feed the CI path; record accurately that check-all.sh is the authoritative local gate while run-tests.yml is plgg-only in CI

## Key Files

- `/home/ec2-user/projects/plgg/scripts/build.sh` - dependency-ordered dist build; insert plgg-md after plgg-view (line ~27), plgg-highlight after plgg-md, plgg-press after plgg-server (line ~30) and plgg-http (line ~24)
- `/home/ec2-user/projects/plgg/scripts/check-all.sh` - per-package runner list (the authoritative local gate); add the three new test runners (and coverage where the repo runs it)
- `/home/ec2-user/projects/plgg/scripts/test-plgg-view.sh` - reference runner shape (`npm run test` in the package) the new test runners mirror
- `/home/ec2-user/projects/plgg/scripts/coverage-plgg.sh` - reference COVERAGE runner shape (`npm run coverage`) — coverage is a SEPARATE script from test (item 17)
- `/home/ec2-user/projects/plgg/.github/workflows/run-tests.yml` - CI today runs gate-vite.sh + only plgg's tsc/test/coverage — record that check-all.sh is the authoritative local gate for the new packages (item 18)

## Dependencies

- Depends on [20260630013502-plgg-md-inline-fold-to-html.md](20260630013502-plgg-md-inline-fold-to-html.md) — plgg-md: inline parser, injected Highlighter + link-resolver seams, EXACT anchor-parity slugs, firstHeading, AST->Html<never> fold
- Depends on [20260630013503-plgg-highlight-ts-scanner.md](20260630013503-plgg-highlight-ts-scanner.md) — Create plgg-highlight: zero-dep TS/TSX syntax highlighting via ts.createScanner, with language-alias normalization
- Depends on [20260630013508-plgg-press-checklinks-anchor-aware.md](20260630013508-plgg-press-checklinks-anchor-aware.md) — plgg-press checkLinks: anchor-aware build-time dead-link validation (404 excluded from route expectations)
- Depends on [20260630013509-plgg-press-dev-server-live-reload.md](20260630013509-plgg-press-dev-server-live-reload.md) — plgg-press dev(): node:http + fs.watch rebuild, allowedHosts from PressOptions, and DEV-ONLY SSE live-reload

## Implementation Steps

1. Edit scripts/build.sh: insert `cd $REPO_ROOT/packages/plgg-md && npm run build` immediately AFTER plgg-view; `plgg-highlight` AFTER plgg-md; `plgg-press` AFTER plgg-server (and after plgg-http, which already builds earlier) — with comments stating plgg-press depends on plgg-md/plgg-highlight/plgg-view/plgg-server/plgg-http (item 13).
2. Create scripts/test-plgg-md.sh, test-plgg-highlight.sh, test-plgg-press.sh mirroring scripts/test-plgg-view.sh (run `npm run test` = tsc --noEmit && plgg-test src in the package).
3. Create scripts/coverage-plgg-md.sh, coverage-plgg-highlight.sh, coverage-plgg-press.sh mirroring scripts/coverage-plgg.sh (run `npm run coverage`); confirm each package's plgg-test.config.json sets >90% thresholds (item 17 — note current plgg-view threshold is 89; new packages target >90% per memory).
4. List the three new test runners (and coverage runners, matching how check-all.sh invokes the existing ones) in scripts/check-all.sh.
5. Record accurately (item 18): scripts/check-all.sh is the AUTHORITATIVE LOCAL gate that runs the new packages' tsc/test/coverage; run-tests.yml in CI currently runs only gate-vite.sh + plgg's tsc/test/coverage — do NOT claim check-all.sh runs in CI. If CI enforcement of the new packages is wanted, that is a run-tests.yml change noted as a follow-up.
6. Run scripts/check-all.sh and confirm the new packages' tsc/test/coverage execute and pass.

## Considerations

- Build order (item 13): plgg-md after plgg-view; plgg-highlight after plgg-md; plgg-press after plgg-server and plgg-http (it depends on all of plgg-md, plgg-highlight, plgg-view, plgg-server, plgg-http).
- Coverage is a SEPARATE `npm run coverage` script from `npm run test` (item 17); the test runners call test, the coverage runners call coverage — mirror the existing coverage-plgg.sh split, do not conflate them.
- MEMORY mandates >90% coverage for the new packages via their own plgg-test.config.json; the existing plgg-view threshold of 89 is a documented V8-ruler exception, not the target for new packages.
- Be accurate about CI (item 18): check-all.sh is the local authoritative gate, not a CI step today.
- The deploy workflow build loop is handled in the deploy-rewire ticket.
