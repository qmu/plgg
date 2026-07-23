---
created_at: 2026-07-19T05:00:00+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 0.5h
commit_hash:
category: Changed
depends_on:
mission: grow-plggmatic-as-the-reference-framework
---

# Publish plggmatic 0.2.1 (plgg lineage) to npm from this repo

## Overview

HUMAN-GATED — do NOT drive unattended. This is the gated release step that
satisfies the mission's open publish acceptance item ("The npm `plggmatic`
package is actually published from this repo"). The package metadata is already
correct in this repo (`packages/plggmatic/package.json`: `version` 0.2.1,
`repository.url` → `git+https://github.com/qmu/plgg.git`); what remains is the
actual `npm publish`, which needs the developer's npm 2FA/token and is a gated
release action prohibited on a drive branch.

## Key files

- `packages/plggmatic/package.json` — `version` 0.2.1, `repository` = `qmu/plgg`
  (already correct; do not change to publish).
- `scripts/publish-npm.sh` — the repo's npm publish flow (2FA/token, `--tag
  latest` past the 1.0.0 ghost), per the release-flow reference.

## Steps

1. Build a clean plggmatic dist and confirm the gate is green
   (`./scripts/check-all.sh`).
2. Run the developer's gated npm publish flow (`scripts/publish-npm.sh`) with
   npm 2FA — this is a human action, not an autonomous one.
3. Confirm `npm view plggmatic version` reports 0.2.1 (plgg lineage) and the
   registry `repository` points at `qmu/plgg`.
4. Tick the mission's "The npm `plggmatic` package is actually published from
   this repo" acceptance item (same line as its `- [ ]` marker) with the
   published version/SHA as evidence, and append a dated Changelog line.

## Policies

- **Operation — releases are a gated step.** Publishing to npm is performed by
  the developer through the gated release flow, never on a drive/CI branch and
  never by an unattended agent; this ticket exists to track that gated step, not
  to perform it automatically.

## Quality Gate

- **Acceptance:** `npm view plggmatic` reports version 0.2.1 with `repository`
  at `qmu/plgg`; the mission's publish acceptance item is ticked with the
  published version as evidence.
- **Verification method:** query the npm registry (`npm view plggmatic`) and
  re-read `mission.md`.
- **Gate that must pass:** `./scripts/check-all.sh` green before publishing.
