---
created_at: 2026-07-20T12:30:05+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Changed
depends_on: [20260720123002-concurrent-by-default-execution.md]
mission: modernize-plgg-test-for-concurrent-speed
---

# Fan out check-all's per-package suites concurrently

## Overview

`check-all.sh` runs the ~32 per-package suites strictly one after another, each
a separate process. Even with a concurrent in-package runner, this cross-package
serialization keeps the phase above target. Run the per-package suites in
parallel — consolidated into the **canonical runner** (command-scripts policy),
adding **no new per-package alias scripts**. A failing suite must still name its
package and test unambiguously, and interleaved output must stay legible.

## Key files

- `scripts/check-all.sh` — the sequential test-suite block.
- `scripts/test-*.sh` — the per-package suite scripts (already isolated
  processes).
- The canonical runner (where the fan-out logic lands).
- `scripts/build.sh` — the topology the ordering derives from (do not fork it).

## Approach

- Replace the sequential suite loop with a **bounded parallel fan-out** through
  the canonical runner, spawning per-package suite processes (cross-runtime
  process spawn, not `worker_threads`).
- Buffer each package's output and emit it **grouped and attributed**, not
  raw-interleaved.
- Preserve `set -e` failure semantics: any red package fails check-all.

## Quality Gate

- **Acceptance:** check-all runs the per-package suites concurrently; a
  deliberately-failing package still fails check-all with clear package + test
  attribution; output stays legible under interleaving.
- **No new per-package alias script is added** (consolidated in the canonical
  runner); no new dependency.

## Policies

- `workaholic:implementation` — command-scripts consolidation (one canonical
  runner, not bespoke per-command scripts); read the implementation-policy
  pillar, not just operation.
- `workaholic:implementation` / `objective-documentation` (attribution verified
  with a deliberately-failing package).
- `workaholic:design` / `vendor-neutrality`.
