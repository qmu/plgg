---
created_at: 2026-07-18T21:05:20+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Changed
depends_on: [20260718210515-plgg-bundle-self-bundled-bin-retire-relocate.md]
claim: work-20260801-182248
---

# Retire relocate.mjs in the other bin consumers (plgg-test, plggpress, plgg-cms)

## Overview

Follow-on to the plgg-bundle self-bundled-bin ticket. The `relocate.mjs`
`/tmp` copy-and-re-exec hack is **also copied into** `plgg-test`, `plggpress`,
and `plgg-cms` (each ships its own copy so its run-from-source `.ts` bin can
run under `node_modules`). Once plgg-bundle proves the compiled-dist bin
pattern, migrate these three the same way so the hack is fully gone from the
monorepo.

**Not part of the modernize-plgg-bundle acceptance set** (deliberately
un-missioned): it is scoped to other packages, so it stays a normal
per-ticket-approval todo rather than the mission's drive-authorized queue.
Promote/re-scope it after the plgg-bundle pattern lands.

## Key files

- `packages/plgg-test/bin/` — its `relocate.mjs` copy and launcher.
- `packages/plggpress/bin/` — its `relocate.mjs` copy and launcher.
- `packages/plgg-cms/bin/` — its `relocate.mjs` copy and launcher.
- The plgg-bundle self-bundle precedent (dep ticket) as the template.

## Approach

- Apply the compiled-dist launcher pattern established for plgg-bundle: each
  package self-bundles its CLI to `dist/`, its bin runs the compiled entry, and
  its `relocate.mjs` + `/tmp` relocate cache are deleted. Reuse, don't
  re-invent, the plgg-bundle approach (don't clone garbage — factor any shared
  launcher helper if one emerged).

## Quality Gate

- **Acceptance:** in a real registry-style install, each of `plgg-test`,
  `plggpress`, `plgg-cms` runs its bin from a compiled dist with **no
  `relocate.mjs` present** and **no `/tmp` relocate dir created**; all three
  `relocate.mjs` copies are deleted and unreferenced.
- The publish smoke (`publish-npm.sh`) bin check passes for each without the
  relocate path; `scripts/check-all.sh` green; no new dependency.

## Policies

- `workaholic:design` / `vendor-neutrality`; `sacrificial-architecture`.
- `workaholic:implementation` / `objective-documentation` (verified by real
  install smoke); `dont-clone-garbage` (factor the shared launcher).

## Final Report

Development completed as planned. All three `relocate.mjs` copies are
deleted and unreferenced; each package runs its bin from a real
registry-shaped install with no `/tmp/plgg-relocate-*` cache.

The three packages did NOT need the same fix, and finding that out is
most of the ticket:

- **plggpress / plgg-cms** take the plgg-bundle precedent verbatim —
  self-bundle the CLI to `dist/cli.es.js` and run it when the package
  realpath is under `node_modules`, run `src/cli.ts` otherwise.
- **plgg-test** needed almost none of it. Its resolver hook already
  owns `.ts` loading (it transpiles with `ts.transpileModule` and
  short-circuits), so Node's node_modules restriction never applies to
  anything the hook handles. Only ONE file was ever the problem: the
  hook itself, which Node loads with default resolution on the loader
  thread. Compiling just that file (`dist/hook.es.js`) retires the
  whole relocation.

### Discovered Insights

- **Insight**: `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` is a
  property of Node's DEFAULT loader, not of the file's location. A
  registered `load` hook that returns transpiled source and
  short-circuits loads `.ts` under `node_modules` perfectly well —
  including the process ENTRY point, which registered hooks do apply
  to (probed on Node 24.13.1).
  **Context**: it means a tool whose hook already transpiles needs
  only its bootstrap file compiled, not a whole self-bundled CLI.
  Reaching for the bundle first would have been a much larger,
  registry-state-splitting change: plgg-test's Runner registry is a
  module singleton, so a bundled CLI plus a `src`-aliased
  `plgg-test` import in the target's specs would be TWO registries,
  and the runner would report zero tests.

- **Insight**: `scripts/publish.ts`'s install smoke returned
  `"import ok"` the moment a package declared `main`/`exports`,
  skipping the bin check entirely. Every package that publishes BOTH
  surfaces — precisely plgg-test, plggpress and plgg-cms — therefore
  had its launcher smoked by nothing at all, which is exactly where a
  run-from-source `.ts` bin breaks.
  **Context**: the gate that was supposed to catch this class of
  defect had a hole shaped like the defect. Both surfaces are now
  checked and the smoke label reports both.

- **Insight**: the bundle emitter wraps every module body in a
  synchronous registry closure, so a module-level `await` in a
  bundled entry is a syntax error. plggpress's and plgg-cms's
  `src/cli.ts` both opened with `await runApp(...)`; they now use the
  `.catch` chain plgg-bundle's own CLI already documents.
  **Context**: any future entry added to a `bundle.config.ts`
  `entries` list must be top-level-await-free, whatever the target.

- **Insight**: the `library` target already emits exactly what a Node
  CLI wants — own source inlined, declared deps external — so a
  package needing BOTH a `.d.ts` library surface and a compiled CLI
  adds the CLI as one more `entries` item rather than needing
  `target: "cli"` (which is per-config, not per-entry, and would drop
  the declaration tree).
  **Context**: `target: "cli"` stays the right answer only for a
  package that publishes nothing but a bin, which is plgg-bundle.

- **Insight**: the shared 118-line `relocate.mjs` was deleted rather
  than refactored into a shared helper. What is genuinely common
  across the four launchers afterwards is one predicate — "is my
  realpath under node_modules" — and factoring five lines would mean
  a new runtime dependency edge (a bin cannot import from a
  devDependency, which is absent in a registry install). Trading a
  dependency edge for five lines is the wrong side of
  vendor-neutrality; the duplication that mattered (a copied hack) is
  gone.
