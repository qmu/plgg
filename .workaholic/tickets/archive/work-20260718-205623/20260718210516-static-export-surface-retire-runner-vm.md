---
created_at: 2026-07-18T21:05:16+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort: 4h
commit_hash:
category: Changed
depends_on:
mission: modernize-plgg-bundle
---

# Derive the ESM export surface statically; retire the vm-execute discovery

## Overview

plgg-bundle discovers a library's export surface by **executing the emitted CJS
bundle in a `node:vm` context** and reading `module.exports` keys
(`src/vendors/runner.ts` `readExportNames`/`evalCjs`), because ESM cannot
declare exports dynamically — so the CJS runtime keys become the ESM named-export
list (`src/domain/usecase/build.ts` `buildEntry`, lines ~200–227). Executing a
bundle to learn its shape is fragile (needs the target's `node_modules`
resolvable, runs arbitrary module top-level code) and is on the concern ledger
(47/51-export-surface).

Derive the export surface **statically** from the TypeScript source/AST (the
`typescript` compiler is already vendored), retiring the execute-to-discover
path.

## Key files

- `packages/plgg-bundle/src/vendors/runner.ts` — `readExportNames`, `evalCjs`,
  `keysOf` (the vm execution + `Object.keys` filter of `__esModule`).
- `packages/plgg-bundle/src/vendors/runner.spec.ts` — existing coverage (plain
  keys, external `require` during discovery, `__esModule` filter) to migrate.
- `packages/plgg-bundle/src/domain/usecase/build.ts` — `buildEntry` (the
  consumer that feeds the names into `emitEsmBundle`); library path only (app
  builds skip export discovery).

## Approach

- Compute the set of **exported names** of the entry module statically via the
  TS API already in `vendors/` (checker/symbol of the source file's module, or
  a static walk of `export`/`export {}`/`export * from` re-exports), producing
  the same sorted, `__esModule`-free name list the vm path returns.
- Replace `readExportNames(cjs, root)` in `buildEntry` with the static
  derivation; remove the vm execution from `runner.ts` (or reduce `runner.ts`
  to the parts still used elsewhere).
- Handle re-exports (`export * from`) so the static list matches the runtime
  list for the real packages (verify against a package that re-exports, e.g.
  `plgg`'s barrel).

## Quality Gate

- **Acceptance:** the ESM named-export list is derived **without executing the
  bundle** — `vendors/runner.ts`'s `evalCjs`/`vm.runInContext` discovery is
  gone, and concern 47/51-export-surface is closable.
- **Equivalence:** for every currently-built library package the statically
  derived export set is **identical** to what the vm path produced (same names,
  same order). Add a spec asserting the derivation over a fixture that includes
  a direct export, a re-export (`export * from`), and a type-only export (which
  must be excluded from the runtime named-export list), plus a build of a real
  re-exporting package.
- `scripts/build.sh` produces byte-identical ESM export blocks for the built
  libraries (diff the emitted `index.es.js` export list before/after);
  `scripts/check-all.sh` green; no new dependency.

## Policies

- `workaholic:implementation` / `domain-layer-separation` (the vendor boundary
  owns the TS API use); `objective-documentation`.
- `workaholic:design` / `vendor-neutrality` (use the already-vendored
  `typescript`, no new dep).
- `workaholic:planning` / `verify-before-building` (prove static == runtime on
  real packages before deleting the vm path).
