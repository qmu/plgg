# TypeScript 7 API gap — measured, 2026-08-12

The spike deliverable of mission `typescript-7-migration` (T1,
`20260812140001`). Everything here is measured against `typescript@7.0.2`
from the registry — a scratch install outside the repository, plus a
Codex-verified tarball inspection (session `019ff466-057f-7540-bef6-2b366e0336b5`).
No repo source, manifest, or lockfile was changed by this spike.

## The mapping table

Every compiler-API symbol the five consumers use, and what TS 7.0.2 offers.

| Old API (consumer) | TS7 counterpart | Verdict |
| --- | --- | --- |
| `ts.transpileModule` (plgg-bundle `transpiler.ts`, plgg-test `hook.ts`) | **NONE.** Full-text search of `dist/**`+`lib/**`: 0 hits. `unstable/sync` `Emitter` has only `printNode`. | **Absent — port is a redesign, not a swap** |
| `ts.preProcessFile` (vendor-boundary-analyzer) | **NONE by name.** But `unstable/ast/scanner` `createScanner` works — PoC below extracts import specifiers correctly. | **Absent, viable scanner route (PoC'd)** |
| `ts.createProgram` (exportSurface) | `unstable/sync` lifecycle: `API → parseConfigFile → Snapshot → Project → getChecker` | Redesign |
| `ts.TypeChecker.getExportsOfModule` / `getAliasedSymbol` | `unstable/sync` `Checker` — `dist/api/sync/api.d.ts:320,298` | **Present** |
| `ts.Symbol`, `ts.SymbolFlags` | `unstable/sync` exports both | Present |
| `ts.ModuleKind` | `unstable/sync` exports it | Present |
| `ts.ScriptTarget` | `unstable/ast` exports it (**gone from the scanner signature** — see below) | Present (moved) |
| `ts.ModuleResolutionKind` (exportSurface) | Not among `unstable/sync` exports (runtime-enumerated) | **Not found** |
| `ts.createIncrementalProgram`, `createIncrementalCompilerHost` (typecheck.ts) | No incremental API on `unstable/sync` (`API` prototype: `ensureInitialized, parseConfigFile, updateSnapshot, close, clearSourceFileCache, getTimingInfo, resetTimingInfo`) | **Not found — gate redesign needed** |
| `ts.getParsedCommandLineOfConfigFile` | `API.parseConfigFile` | Present (renamed/reshaped) |
| `ts.formatDiagnostics`, `formatDiagnosticsWithColorAndContext` | Not among `unstable/sync` exports | Not found |
| `ts.sys`, `ts.CompilerHost`, `ts.CompilerOptions`, `ts.SourceFile` | Host model replaced by the API/Snapshot design; `unstable/fs` exists | Redesign |
| `ts.DiagnosticCategory` | `unstable/sync` exports it | Present |

Key structural facts:

- `unstable/ast` (409 exports) has **no parser** — nothing matching
  `parse|createSource`. From JS, an AST is only obtainable through the
  Go-process API (`unstable/sync`/`async`); `unstable/ast` is types,
  SyntaxKind, the scanner, visitors, and factories over *received* ASTs.
- `exports["."]` is `lib/version.cjs` (`version`, `versionMajorMinor` only).
  Old `lib/typescript.js` does not exist in the tarball; subpath requires
  are blocked by the exports map.
- Only stable 7.x releases are `7.0.1-rc` and `7.0.2` — every later
  version is a `7.1.0-dev` nightly. So "absent from 7.0.2" is currently
  "absent from every adoptable 7.x".

## The scanner PoC (vendor-boundary analyzer route)

The TS7 scanner **works** for import extraction, with one trap: the
signature changed. `ScriptTarget` is gone (the Go scanner is
target-independent):

```js
// TS6: createScanner(languageVersion, skipTrivia, variant, text)
// TS7: createScanner(skipTrivia, languageVariant?, textInitial?, start?, length?)
const { createScanner } = require("typescript/unstable/ast/scanner");
const sc = createScanner(true, LanguageVariant.Standard, sourceText);
```

Calling it with the TS6 argument order compiles and then **loops forever
returning `SyntaxKind.Unknown`** — the misuse is silent, not an error.
With the corrected signature, a token-level walk extracted
`["typescript","side-effect","plgg","plgg-sql"]` from a fixture covering
`import from` / bare `import` / `export * from` / dynamic `import()`.
T6 can proceed on this route.

## The 28/29 reproduction (compiler options are compatible)

`tsc 7.0.2 -p <config> --noEmit --pretty false` over all 29 package
tsconfigs, raw log in [`typescript-7-tsc-repro.log`](typescript-7-tsc-repro.log):
**28 exit 0 with zero diagnostics; only `plgg-cms` fails (exit 1)**, with
the identical two errors it produces under TS 6.0.3 (stale sibling dist,
pre-existing, not a TS7 effect). No compiler option was rejected or warned
about. Note TS6 exits 2 on diagnostics where TS7 exits 1 — do not assert a
specific nonzero exit code anywhere.

## Native-binary measurements (aarch64 host)

| Metric | TS 6.0.3 | TS 7.0.2 |
| --- | --- | --- |
| Install size | 24M (`node_modules/typescript`) | 30M (`typescript` + **1** platform pkg, `@typescript/typescript-linux-arm64`) |
| Packages installed | 1 | 2 (of 20 declared optionals; lockfile records all 20) |
| `tsc --version` startup | 0.057s (node) | 0.035s (native) |
| Scratch install time | — | ~1s (2 packages, warm cache) |

`bin/tsc` exists and `tscBin()`'s path arithmetic (`resolve("typescript")`
→ `lib/version.cjs` → `../bin/tsc`) holds on 7.0.2 — an unguaranteed but
working contract.

## What this means for the mission

1. **T6 (analyzer) is viable now** — scanner route PoC'd. Signature trap
   documented above.
2. **T2/T3 (`transpileModule`) is the wall.** No stable 7.x offers a
   file-level transpile API. The realistic routes are (a) reimplement
   transpile over the API/AST surface (heavy, unstable), (b) keep
   TS 6 pinned for `plgg-bundle`/`plgg-test`'s runtime dependency while
   the rest of the toolchain moves (split-version), or (c) stay on 6.x.
   Choosing among these is the mission's central decision, and it is a
   developer decision, not a drive-time default.
3. **T4 (typecheck gate) loses incremental** — no incremental API exists;
   the Go process has its own caching but nothing exposed to replace
   `.tsbuildinfo`-driven `createIncrementalProgram`. Needs wall-clock
   measurement of the full-check path before judging.
