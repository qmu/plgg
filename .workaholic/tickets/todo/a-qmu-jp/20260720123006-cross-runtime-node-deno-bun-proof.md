---
created_at: 2026-07-20T12:30:06+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Added
depends_on: [20260720123002-concurrent-by-default-execution.md]
mission: modernize-plgg-test-for-concurrent-speed
---

# Prove the concurrent runner is cross-runtime (Node + Deno/Bun)

## Overview

The mission's hard constraint is that plgg-test behaves identically on Node,
Deno, and Bun — the reason `worker_threads` was ruled out. Prove it: execute the
runner green on a **second runtime** (Deno or Bun) in addition to Node, and keep
a guard/documented procedure so a Node-only concurrency primitive can never
creep back in.

## Key files

- `packages/plgg-test/src/Core/Runner.ts` and the runner entrypoint — the
  concurrency primitives that must stay runtime-agnostic.
- A cross-runtime smoke script (mirroring the `gate-*.sh` style, if a gate is
  the right shape).

## Approach

- Run the plgg-test self-suite (or a representative slice) under Deno/Bun as
  well as Node.
- Document the exact command; optionally add a gate so the second-runtime run
  is checkable.
- Remove any Node-only API the run surfaces.

## Quality Gate

- **Acceptance:** the plgg-test self-suite (or a representative slice) runs
  green on Node **and** at least one of Deno/Bun; the command is documented; no
  Node-only API remains in the runner.
- No new dependency.

## Policies

- `workaholic:design` / `vendor-neutrality` (cross-runtime is the point).
- `workaholic:implementation` / machine-checkable (proven by an actual
  second-runtime run, not asserted).
