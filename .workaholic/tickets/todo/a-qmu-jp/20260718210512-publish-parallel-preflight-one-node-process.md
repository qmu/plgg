---
created_at: 2026-07-18T21:05:12+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure, Config]
effort: 4h
commit_hash:
category: Changed
depends_on:
mission: modernize-plgg-bundle
---

# Publish preflight: compute the set in one Node process with parallel registry queries

## Overview

Today `scripts/publish-npm.sh` computes the publish set with a **serial fork
storm** (measured 2026-07-13, PR #66 ship): per package it spawns one
`npm view <name> version` network round-trip plus ~3 `node -p
"require(...).name|.version|.private"` process spawns, looping over 24
non-private packages before it knows what to publish — tens of seconds of
banner spew.

Replace that preflight with a **single Node/TS program**, `scripts/publish.ts`,
that the existing `scripts/publish-npm.sh` shell wrapper invokes (developer
decision 2026-07-18: one Node process, no new bespoke per-command `.sh`, per
the command-scripts consolidation + vendor-neutrality). This ticket delivers
**only the preflight** (the set computation and its printed summary); the
publish/verify path restructure is its own ticket.

## Key files

- `scripts/publish-npm.sh` — preflight loop (lines ~38–135): `ORDER`
  derivation (sed-scrape of `build.sh` + prepend `plgg-bundle`), the
  per-package `npm view`/`node -p` loop, the inline semver-tuple compare, and
  the `PREFLIGHT=1` early-exit path `/ship` calls.
- `scripts/build.sh` — the build order `ORDER` is scraped from.
- `packages/*/package.json` — 24 non-private (`private:false`) packages; 11
  private (`@plgg/example`, `@plgg/guide`, `plgg-poc*`).

## Approach

- New `scripts/publish.ts`: read every `packages/*/package.json` in-process
  (one `fs` pass, no `node -p`), derive name/version/private and the build
  order, and issue the registry-version queries **concurrently**
  (`Promise.all`), preserving today's set semantics: local version strictly
  greater than remote ⇒ PUBLISH; equal/lower ⇒ SKIP; absent remote ⇒ PUBLISH;
  `private:true` ⇒ skipped. Keep the component-wise `[major,minor,patch]`
  compare (missing remote = `[-1,0,0]`).
- `publish-npm.sh` `PREFLIGHT=1` now delegates the set computation to
  `publish.ts` and prints a compact, banner-free `PUBLISH / SKIP / private`
  summary. The `ONLY=<pkg>` filter is preserved.

## Quality Gate

- **Acceptance:** `publish.ts` computes and prints the publish set in **≤5s
  wall clock** over all 24 non-private packages, in **one Node process** — no
  per-package `node -p`/`npm view` spawn. Verify with `time
  PREFLIGHT=1 ./scripts/publish-npm.sh` (or `time node --experimental-strip-types
  scripts/publish.ts --preflight`) on a warm network and confirm ≤5s and a
  clean, structured set listing.
- **Correctness:** the computed set is identical to the current script's for a
  known state — a package at a version strictly above the registry appears
  under PUBLISH; equal/older under SKIP; a never-published package under
  PUBLISH; private packages excluded. Cover the version compare with a unit
  test (the semver-tuple compare is pure — extract and test it).
- **Vendor-neutrality:** zero new dependencies — the program runs on the
  already-present `typescript` + Node only (type-stripping at runtime, and it
  typechecks under a tsconfig that includes `scripts/`).
- `scripts/tsc-plgg.sh` clean; `scripts/check-all.sh` green.

## Policies

- `workaholic:design` / `vendor-neutrality` (zero new deps — the project's own
  TypeScript only).
- `workaholic:operation` / `local-ci-cd-execution` (releases stay
  script-driven from `/ship`); the command-scripts consolidation (no new
  bespoke per-command scripts — fold into the canonical publish path).
- `workaholic:implementation` / `objective-documentation` (the ≤5s bar is
  measured, not asserted).
