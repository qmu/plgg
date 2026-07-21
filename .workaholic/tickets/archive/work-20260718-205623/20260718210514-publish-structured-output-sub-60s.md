---
created_at: 2026-07-18T21:05:14+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure, Config]
effort: 4h
commit_hash:
category: Changed
depends_on: [20260718210512-publish-parallel-preflight-one-node-process.md, 20260718210513-check-all-same-session-green-stamp.md]
mission: modernize-plgg-bundle
---

# Single-package publish in ≤60s with structured, banner-free output

## Overview

With the preflight moved into `scripts/publish.ts` (dep) and the gate
auto-skippable on a same-session green stamp (dep), restructure the **publish +
verify** path so a single bumped package goes stage → publish → verify in **≤60s
wall clock** with clean, structured output. Today the path is right in cost but
ugly in presentation: raw `npm notice` spew, `MODULE_TYPELESS_PACKAGE_JSON`
warnings, interleaved `===` banners, and a `sleep 2 × ≤30` resolve-poll.

## Key files

- `scripts/publish-npm.sh` — staging (lines ~161–205: copy `files` allowlist
  into `mktemp .publish-stage.XXXXXX`, rewrite `file:` deps to `^<version>`,
  `npm publish --tag latest --ignore-scripts`), the resolve-poll (lines
  ~220–229), and the scratch `npm init`/`npm install`/import+bin smoke (lines
  ~231–267).
- `scripts/publish.ts` — extend with the publish/verify orchestration and the
  compact summary.

## Approach

- Move the publish + verify orchestration into `publish.ts`, keeping
  `publish-npm.sh` as the thin wrapper (`npm whoami`, then delegate). Preserve
  the staging semantics (allowlist copy, `file:`→`^version` rewrite,
  `--ignore-scripts`) and the bin-vs-import smoke branch (plgg-bundle is
  bin-only → `--help` smoke; the `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`
  guard stays until the bin runs from dist).
- Quiet npm (`--loglevel=warn`/`error`) and emit a **compact structured
  summary** per package: `staged → published <name>@<ver> → resolved
  (<n> tries) → import ok / bin ok`. No `===` banner walls.
- Keep the resolve-poll (registry propagation is real and cannot be removed)
  but tighten cadence and print a single progress line, not one per `sleep`.

## Quality Gate

- **Acceptance:** a single-package publish with a same-session green gate
  completes **stage → publish → verify in ≤60s wall clock** (measure with
  `time`, excluding only unavoidable registry propagation, which is reported).
  Output is **structured and banner-free** — no raw `npm notice` walls, no
  `MODULE_TYPELESS_PACKAGE_JSON` lines in the publish output, one compact
  status line per phase.
- **Behavior preserved:** staging allowlist, `file:`→`^version` rewrite,
  `--tag latest --ignore-scripts`, the import smoke for importable packages and
  the `--help` bin smoke for bin-only packages all still run and still fail
  loudly on a broken publish.
- Dry-runnable verification: the orchestration is exercisable without a real
  publish where feasible (stage + local pack), so it is not only testable live.
- `scripts/check-all.sh` green; no new dependency.

## Policies

- `workaholic:operation` / `local-ci-cd-execution` (script-driven release from
  `/ship`); command-scripts consolidation (one canonical publish path).
- `workaholic:design` / `vendor-neutrality`.
- `workaholic:implementation` / `objective-documentation` (≤60s measured; the
  phases are observable status lines).
