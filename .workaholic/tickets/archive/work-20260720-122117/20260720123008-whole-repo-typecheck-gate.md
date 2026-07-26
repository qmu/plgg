---
created_at: 2026-07-26T10:00:00+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Changed
depends_on: []
mission: modernize-plgg-test-for-concurrent-speed
---

# Take `tsc` off the per-package test hot loop — one whole-repo typecheck gate

## Overview

**Lever 1 of the T1-validated order (−~51 s of 296.5 s).** Every package's
`npm run test` is `tsc --noEmit && plgg-test src`, so the test phase pays **38
cold `tsc` programs**: 50.9 s total, of which ~0.8–1.5 s per package is pure
cold-start floor (lib.d.ts + `@types/node` parsed and checked from scratch,
38 times over) — paid even by a package with one spec file.

Tests do not need `tsc` to *run*: they already execute through Node's native
type-stripping. Typechecking is a separate concern that belongs in **one**
repo-wide gate, where the expensive shared type graph is paid **once**.

This ticket makes typecheck a single canonical gate and removes it from the
per-package test scripts. It is the cleanest cut in the mission: it deletes 38
cold process starts without touching a single line of test semantics.

## Key files

- `packages/*/package.json` — the `"test": "tsc --noEmit && plgg-test src"`
  script in all 38 tested packages (the `tsc --noEmit &&` prefix comes off).
- `scripts/check-all.sh` — gains the single typecheck gate ahead of the test
  phase.
- `scripts/tsconfig.json` — the existing repo-tooling tsconfig the new driver
  is typechecked under.
- `packages/plgg-bundle/node_modules/typescript` — the project's own
  TypeScript, already the compiler check-all uses for `scripts/*.ts`. **No new
  dependency.**
- `scripts/tsc-*.sh` — the per-package dev aliases stay (CLAUDE.md points at
  `scripts/tsc-plgg.sh`); they are not the hot loop and are untouched.

## Approach

- Add **one canonical typecheck driver**, `scripts/typecheck.ts`, alongside the
  existing repo tooling (`publish.ts`, `gateStamp.ts`, `stagePackage.ts`) — not
  a new per-package alias script, per the command-scripts policy.
- The driver discovers every `packages/*/tsconfig.json` and creates **one
  TypeScript `Program` per package inside a single process**, sharing one
  `CompilerHost` source-file cache across the programs so `lib.*.d.ts`,
  `@types/node` and the built `plgg` `.d.ts` are read and parsed **once** for
  the whole repo instead of 38 times. Per-package `compilerOptions` stay
  authoritative — there are **12 distinct tsconfig shapes** (DOM vs node-only
  `lib`, `NodeNext` vs `ESNext`, differing `paths`), so merging them into one
  program is explicitly rejected: it would let a node-only package see `DOM`
  and silently weaken checking.
- Report diagnostics with `ts.formatDiagnosticsWithColorAndContext`, prefixed by
  the owning package so an error names its package unambiguously. Non-zero exit
  on the first package with errors (all packages still checked, so one run
  reports every error).
- If the shared-host cache alone does not cut the bucket enough, additionally
  fan the programs out over ≈`nproc` child processes and/or enable
  `incremental` + a per-package `tsBuildInfoFile` (TypeScript 6 supports
  `incremental` with `noEmit`) so warm re-runs are near-instant. Measure before
  and after each step; keep only what the measurement justifies.
- Drop `tsc --noEmit && ` from every package's `test` script (`coverage` script
  likewise), and insert `node scripts/typecheck.ts` into `check-all.sh` **before**
  the test phase so a type error still fails the gate at least as early as today.
- `scripts/typecheck.ts` is itself covered by the existing check-all step that
  typechecks `scripts/tsconfig.json` and runs `node --test scripts/*.spec.ts`;
  add `scripts/typecheck.spec.ts` for its pure helpers (package discovery,
  diagnostic formatting, exit-code folding).

## Quality Gate

- **Acceptance:** one command typechecks every package; a type error
  deliberately introduced into **any** package (verify with at least one leaf
  package and one DOM-lib package) still fails `check-all`, naming the package;
  no package's `test` script runs `tsc` any more; and the measured wall clock of
  the whole-repo typecheck is **recorded against the 50.9 s / 38-cold-programs
  baseline** with the command and raw output in the Final Report.
- No `as` / `any` / `ts-ignore`. No new dependency (the project's own
  TypeScript only). No new per-package alias script. Prettier printWidth 50.
- `scripts/typecheck.spec.ts` covers the driver's pure helpers; the existing
  `node --test scripts/*.spec.ts` step stays green.

## Considerations

- **Checking strictness must not regress.** The whole point of one program per
  package is that each package keeps its own `lib`/`types`/`paths`. A run that
  is fast because it checks less is a failure, not a win — that is what the
  deliberate-type-error verification exists to catch.
- The DOM-lib packages (`plgg-view`, `plggmatic`, `example`, the poc fleet) and
  the `paths` self-aliases (`plgg/*` → `./src/*`) are the two places a merged
  program would break; keep them per-package.

## Policies

- `workaholic:implementation` — command-scripts consolidation: one canonical
  driver in `scripts/`, never a bespoke per-package script.
- `workaholic:implementation` / `objective-documentation` — the speedup is a
  measured wall clock with its command recorded, not an assertion.
- `workaholic:design` / `vendor-neutrality` — the project's own TypeScript, no
  new dependency, no Node-only concurrency primitive.

## Final Report

Landed as `scripts/typecheck.ts` (+ `scripts/typecheck.spec.ts`), wired into
`check-all.sh` after `build.sh`, with `tsc --noEmit && ` stripped from all 38
packages' `test` and `coverage` scripts.

### Measured — every number below is from a run executed in this ticket

**Before** — 37 cold `tsc --noEmit` programs, one per package, timed exactly as
the retired `test` scripts invoked them:

```
$ sh scratchpad/tscbase.sh    # per-package: cd packages/<p> && node …/tsc --noEmit
…
packages/plgg-poc6-classify 1.187829005 status=0
TOTAL 50.856038817
```

**After** — one gate, 38 packages (one MORE than the old path covered:
`plgg-mcp` was never in check-all's list and is now checked):

```
$ node scripts/typecheck.ts     # cold, no build info present
typecheck: 38 packages in 34.4s — all clean
$ node scripts/typecheck.ts     # warm
typecheck: 38 packages in 16.3s — all clean
$ node scripts/typecheck.ts     # warm, steady state
typecheck: 38 packages in 12.7s — all clean
```

**Test phase, before → after** (same harness, same session, warm tree, each
`./scripts/test-*.sh` timed as `check-all.sh` invokes it):

```
before: TOTAL 228.489441103   (37/37 green)
after:  TOTAL 157.944690366   (37/37 green)
```

So the phase drops **70.5 s**, and the whole-repo gate costs **12.7 s warm**
(34.4 s on a first run) — a net **~58 s** off the 228.5 s baseline, while
checking one package more than before.

### Verification that the gate still gates

```
# type error injected into packages/plgg (node-only, declaration-emitting)
typecheck: 38 packages in 12.7s — FAILED in 1: plgg
  packages/plgg/src/__typecheck_probe.ts:1:14 - error TS2322: Type 'string'
  is not assignable to type 'number'.

# type error injected into packages/plgg-view (DOM lib)
EXIT=1
typecheck: 38 packages in 12.6s — FAILED in 1: plgg-view

# DOM usage in packages/plgg-parser (node-only lib) — must NOT compile
EXIT=1 (expect 1 — plgg-parser is node-only lib, must not see DOM)
typecheck: 38 packages in 12.7s — FAILED in 1: plgg-parser
```

The third probe is the important one: it proves the shared compiler host does
**not** leak `DOM` from a DOM-lib package into a node-only package. Strictness is
preserved; the gate is faster because the type graph is parsed once, not because
it checks less.

`node packages/plgg-bundle/node_modules/typescript/bin/tsc -p scripts/tsconfig.json`
clean; `node --test scripts/*.spec.ts` → 26 pass / 0 fail;
`./scripts/gate-vendor-boundary.sh` and `./scripts/gate-readme.sh` green.

### Discovered Insights

- **Insight**: **Fanning the typecheck out over 4 processes bought nothing** —
  29.6 s wall for a 4-way split vs 28.6 s single-process, with each worker taking
  22–28 s for only 9–10 packages. **Context**: each worker re-parses the whole
  shared `.d.ts` graph in its own process, so the fan-out multiplies the one cost
  the single-process design exists to pay once. This is the opposite of the test
  phase, where fan-out is the main lever — do not assume a lever transfers
  between the two phases. Measured, not assumed; the single-process design was
  kept because of it.
- **Insight**: `ts.getPreEmitDiagnostics(builder.getProgram())` silently defeats
  incremental checking — it re-checks every file from the raw program and never
  touches the builder's cache. Routing through it measured **49.8 s** where the
  builder's own `getSemanticDiagnostics()`/`getSyntacticDiagnostics()` measured
  **12.7 s warm**. **Context**: the API pair looks interchangeable and the fast
  one is the less obvious one; anyone touching this file will reach for
  `getPreEmitDiagnostics` first, so the comment in `checkProject` says so
  explicitly with the numbers.
- **Insight**: Incremental costs on the FIRST run what it saves on every one
  after — cold went 28.6 s → 34.4 s once build-info writing was added, warm went
  to 12.7 s. **Context**: the trade is right for a repo where check-all runs many
  times per day, but a CI job on a fresh clone pays the worse number. The build
  info lives at `packages/<p>/node_modules/.cache/typecheck.tsbuildinfo` — inside
  an already-ignored directory, so it needs no `.gitignore` entry and can never
  ship in a package tarball.
