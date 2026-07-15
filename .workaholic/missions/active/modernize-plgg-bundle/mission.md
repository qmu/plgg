---
type: Mission
title: Modernize plgg-bundle
slug: modernize-plgg-bundle
status: active
created_at: 2026-07-13T11:35:10+09:00
author: a@qmu.jp
tickets: []
stories: []
concerns: []
---

# Modernize plgg-bundle

## Goal

plgg-bundle is now the monorepo's only build tool AND a registry-published product other repos (qmu/plggmatic) depend on — but it still carries its bootstrap-era scaffolding, and the developer experience around it has degraded to the point of being a daily irritant (2026-07-13, developer verbatim: the publish flow's output is ugly and slow — "I cannot stand this"). The mission modernizes plgg-bundle and its release path so that publishing a bumped package is a sub-minute, clean-output routine and the bundler itself sheds its known structural debts, while honoring the vendor-neutrality pillar (zero new dependencies — the project's own TypeScript only).

Concretely, today's costs (measured 2026-07-13 during the PR #66 ship):

- `scripts/publish-npm.sh` preflight runs one serial `npm view` network round-trip per package (22 non-private packages) plus ~3 `node -p` process spawns per package before doing anything — tens of seconds of silent-ish banner spew before the publish set is even known.
- Without `SKIP_GATE=1` the script re-runs the full `check-all.sh` (fresh rebuild of every package + every test suite — minutes) even for a single-package patch publish.
- Per published package it polls the registry in a `sleep 2` loop (up to 60s), then does a scratch `npm init` + `npm install` + import/bin smoke — right in cost, ugly in presentation (raw npm notice spew, Node MODULE_TYPELESS_PACKAGE_JSON warnings, interleaved `===` banners).
- The run-from-source bin needs the `relocate.mjs` /tmp copy-and-re-exec hack (cache keyed by version+install-path), which silently masks hot-patched sources during verification (bit us during the PR #66 golden check) and adds startup latency for every registry consumer.

## Scope

**In scope**

1. **Publish DX**: restructure the npm release path so a single bumped package publishes in well under a minute with clean, structured output — parallel preflight in one Node process (no per-package `node -p`/`npm view` fork storm), quiet npm invocations (`--loglevel`), a compact publish-set/verify summary, and an auto-skippable gate (a recorded same-session green `check-all` stamp instead of the manual `SKIP_GATE=1`). Consolidate into the existing canonical runner per the command-scripts policy — no new bespoke per-command scripts.
2. **Bin distribution**: retire the `relocate.mjs` out-of-node_modules copy hack — ship a launcher that runs from a compiled dist (plgg-bundle can bundle itself), eliminating the /tmp relocate cache, its stale-copy verification trap, and Node's type-stripping restriction as a production dependency.
3. **Structural debts already on the concern ledger**:
   - export surface discovered by *executing* the CJS bundle (`vendors/runner.ts`) → derive statically (concern 47/51-export-surface).
   - published bundles are unminified with no size accounting (concern 47/51-published-library).
   - the inlined-dist externals-key rewrite depends on the exact TS-printer shape `"<spec>": __extN` (PR #66 concern) → make the emitted registry shape an explicit, tested contract.
4. **Warning hygiene**: the MODULE_TYPELESS_PACKAGE_JSON warnings emitted while building every package (bundle.config.ts loading) — silence structurally, not by suppressing stderr.

**Out of scope**

- New runtime features of the bundler (watch mode, plugins, HMR beyond what exists).
- Any new dependency (vendor-neutrality pillar) or hosted-CI-owned publishing (Local CI/CD Execution policy keeps releases script-driven from /ship).
- The npm registry's own propagation latency (the resolve-poll can shrink but not disappear).

## Acceptance

- [ ] Preflight computes and prints the publish set in ≤5s over all packages, in one Node process with parallel registry queries (ticket TBD)
- [ ] A single-package publish with a same-session green gate completes end-to-end (stage → publish → verify) in ≤60s wall clock with structured, banner-free output (ticket TBD)
- [ ] The check-all gate auto-skips on a recorded same-session green run — `SKIP_GATE=1` is no longer something a human must remember (ticket TBD)
- [ ] plgg-bundle's bin runs from a compiled dist in a real registry install — `relocate.mjs` and the /tmp relocate cache are deleted (ticket TBD)
- [ ] Export surface for the ESM emit is derived statically; `vendors/runner.ts` execute-to-discover is retired (concern 47/51-export-surface closed) (ticket TBD)
- [ ] Published bundles are minified or their size is measured and accepted in the story; size is printed per publish (concern 47/51-published-library closed) (ticket TBD)
- [ ] The emitted registry/externals-table shape is an explicit tested contract; the flatten-time key rewrite no longer pattern-matches TS-printer incidentals (PR #66 concern closed) (ticket TBD)
- [ ] Package builds emit no MODULE_TYPELESS_PACKAGE_JSON warnings (ticket TBD)

## Changelog

<!-- Append-only, dated timeline relating this mission's tickets and reports over time.
     One line per event ("- YYYY-MM-DD — event — filename"); never rewrite past lines. -->
- 2026-07-15 — ticket archived — 20260714214624-plggpress-first-class-dev-command.md
- 2026-07-15 — ticket archived — 20260715022802-migrate-guide-and-strategy-onto-plggpress-dev.md
- 2026-07-15 — ticket archived — 20260715023339-guide-dev-server-scans-its-own-dist.md
