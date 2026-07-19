---
created_at: 2026-07-19T12:53:28+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 1h
commit_hash:
category: Changed
depends_on: [20260718210514-publish-structured-output-sub-60s.md]
mission: modernize-plgg-bundle
blocked: human-gated — requires a LIVE npm publish + 2FA; DO NOT drive autonomously
---

# Measure the live single-package publish end-to-end at ≤60s

## Overview

Ticket 20260718210514 restructured the publish + verify path into
`scripts/publish.ts` (`--publish` orchestration + `--dry-run`), with
quiet npm and compact, banner-free per-phase output. The structure and
the staging were verified without a live publish: the pure staging
rewrite is unit-tested (`scripts/stagePackage.spec.ts`), and
`node scripts/publish.ts --dry-run --only "<pkg>"` stages + `npm pack`s a
real tarball and prints one compact line per package — no registry
touched.

What remains is the mission-acceptance MEASUREMENT that can only be taken
against the real registry: a single bumped package going stage → publish
→ verify in **≤60s wall clock**. That needs a real `npm publish` (auth +
2FA) and is therefore **human-gated** — the night/unattended drive's
safety floor forbids any publish, so this was split out rather than
faked.

## Why this is a separate, human-gated ticket

- A real publish mutates the public npm registry (irreversible for that
  version) and requires the developer's authenticated session + 2FA.
- The ≤60s number is a wall-clock measurement of a live round-trip; a
  dry-run cannot produce it (registry propagation is the very thing being
  timed, minus what is reported).

## Steps (developer, at a real `/ship`)

1. Bump exactly one package's version (e.g. a patch to `plgg-bundle`).
2. Run a same-session green `./scripts/check-all.sh` so the gate
   auto-skips (ticket 20260718210513's stamp).
3. `time ./scripts/publish-npm.sh` (it delegates to
   `node scripts/publish.ts --publish --only "<dir>"`).
4. Confirm: stage → publish → verify completes in **≤60s** wall clock
   excluding only reported registry propagation; the output is the
   compact per-phase lines (`staged` → `published` → `resolved (<n>
   tries)` → `bin ok`/`import ok`), with no `===` banner walls, no raw
   `npm notice` spew, and no `MODULE_TYPELESS_PACKAGE_JSON` lines.

## Quality Gate

- **Acceptance:** the measured wall clock for one bumped package is
  ≤60s (registry propagation reported separately), and the live output
  matches the structured form the dry-run already demonstrates.
- If it exceeds 60s, file the slow phase (publish vs resolve-poll vs
  smoke install) as a follow-up — the resolve-poll cadence in
  `publish.ts` (`resolveOnRegistry`) is the first tuning knob.

## Policies

- `workaholic:operation` / `local-ci-cd-execution` (releases are
  script-driven from `/ship`; the measurement is taken there).
- `workaholic:implementation` / `objective-documentation` (the ≤60s is a
  measured number, not an assertion).
