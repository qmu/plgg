---
created_at: 2026-07-20T12:30:06+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Changed
depends_on: [20260720123004-global-stub-isolation-under-concurrency.md]
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

## Final Report

Proven on **all three** runtimes, not just a second one — Node v24.13.1,
Deno 2.9.2 and Bun 1.3.14 were all already installed on this machine.

`scripts/gate-cross-runtime.sh` runs `packages/plgg-test/fixtures/
crossRuntimeSmoke.ts` under each runtime present and is wired into `check-all`
beside the other gates. Deno and Bun are optional (reported as skipped when
absent); Node is not.

```
=== Gate: cross-runtime scheduler parity ===
--- node ---
cross-runtime smoke: OK — 7 passed, concurrency and suite.serial both behaved
--- deno ---
cross-runtime smoke: OK — 7 passed, concurrency and suite.serial both behaved
--- bun ---
cross-runtime smoke: OK — 7 passed, concurrency and suite.serial both behaved
cross-runtime gate passed
```

The smoke drives the scheduler's whole contract, not a token assertion:
independent tests overlap, a `suite.serial` block stays indivisible, and the
report keeps registration order regardless. It exits non-zero if any of those
fails.

**Mutation-checked** — forcing `DEFAULT_CONCURRENCY` to 1 makes all three
runtimes report `cross-runtime smoke: FAILED` and the gate exit 1:

```
cross-runtime gate FAILED on: node deno bun
gate exit=1 (expect 1)
```

Full gate green: `CHECKALL EXIT=0`, `WALL=116.3s`, test phase 33.8 s.

### What is portable and what is not — stated precisely

The **scheduler** is portable and that is the constraint. The **launcher around
it** is Node-specific and always was, deliberately: `bin/plgg-test.mjs` spawns
children with Node flags, the `plgg-test/index` self-alias is resolved by a Node
`module.register` hook, and coverage uses `NODE_V8_COVERAGE`. The smoke imports
the façade by relative path precisely to step around the alias hook, so what it
measures is the scheduler and nothing else. Both facts are now in the README.

### Discovered Insights

- **Insight**: **Node is the runtime that needs the most help.** Running the
  smoke on Node without plgg-test's `--import` resolver hook fails with
  `ERR_MODULE_NOT_FOUND` on `./Registry.js` — Node's type-stripping does not
  resolve TypeScript's `.js`-for-`.ts` specifier convention. Deno and Bun both do
  it natively and needed **no flags at all**. **Context**: the exact inverse of
  the usual "does it work outside Node?" worry, and it is why the gate's Node
  invocation is the long one.
- **Insight**: Running plgg-test's **full self-suite** on the other runtimes
  fails, and for reasons that are not the scheduler: Bun 144 passed / 3 failed
  (its `globalThis` already carries `window`/`self`, so the in-house DOM's
  install/teardown assertions do not hold), Deno 101 passed / 10 failed (the
  `plgg-test/index` self-alias needs the Node `module.register` hook Deno does
  not run). **Context**: this is why the ticket's "or a representative slice"
  wording matters. Chasing full-suite parity would mean porting the DOM
  environment and writing a resolver per runtime — real work, unrelated to the
  no-`worker_threads` constraint this gate exists to defend.
- **Insight**: The smoke and its fixture live in `fixtures/`, which is outside
  the package's `rootDir: src`, so they are neither typechecked nor
  coverage-counted. **Context**: that is what lets them import `../src/index.ts`
  with an explicit `.ts` extension (which the package tsconfig forbids) — the one
  spelling all three runtimes resolve identically.
