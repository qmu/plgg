# plgg-bundle

The in-house minimal library bundler for the plgg monorepo. It reproduces what
`vite build` + `vite-plugin-dts` produced for a library package — dual ESM+CJS
output plus a per-file `.d.ts` tree — with **zero new dependencies** and **no
native binding**, retiring the rolldown native-binding fragility that broke CI.

## Why plain TypeScript (not the plgg Result/Option idiom)

Every other `packages/` TypeScript follows the house functional idiom
(`Result`/`Option`/`pipe`/exhaustive `match`). **plgg-bundle deliberately does
not.** It is written in plain TypeScript — native control flow, guard-clause
early returns, and `throw` on failure caught once at the bin boundary
(`src/entrypoints/cli.ts`) and turned into a process exit code.

The reason is a hard bootstrap constraint: **a foundation build tool must not
depend on the artifact it builds.** plgg-bundle's job is to build `plgg`'s
`dist`. If the bundler imported `plgg`, then:

- on a clean checkout / fresh CI runner with no `packages/plgg/dist`, the tool
  could not even start (`ERR_MODULE_NOT_FOUND`) — it cannot import the thing it
  is about to produce; and
- resolving `plgg` from *source* instead is not viable either: plgg's source is
  not loadable under Node's type-stripping without converting the whole core
  package to `verbatimModuleSyntax` + ESM (527 fixes across 109 files) — far out
  of scope.

So the bundler depends on **nothing it builds** and nothing new — only the
project's own `typescript` (reused) via `ts.transpileModule` and
`tsc --emitDeclarationOnly`. This mirrors the existing repo precedent of
plgg-test's launcher being plain `.mjs` "because it runs at the very process
entry." The FP idiom governs the library and its consumers; bootstrap tooling
is exempt.

What still holds: the **CLAUDE.md hard rule** — no `as`, no `any`, no
`@ts-ignore`/`@ts-expect-error` — applies here too. Validation at the `unknown`
boundary (`asBundleConfig`) uses real `typeof`/`Array.isArray`/`instanceof`
guards; an unknown function's `any` return is contained to `unknown` before use.

## Layout

- `src/domain/model` — the config model (`BundleConfig`, `applyFileName`).
- `src/domain/usecase` — pure bundling logic: `asBundleConfig` (validate at the
  `unknown` boundary), `collectModules` (import-graph walk), `emitBundle`
  (collision-free module-registry runtime → ESM + CJS), `emitDts` (per-file
  `.d.ts` via tsc + `rewriteDtsAliases`), `resolveSpecifier`, `isExternal`,
  `build` (orchestrator).
- `src/vendors` — the anti-corruption boundary over the only externalized work:
  `transpiler.ts` (`ts.transpileModule`) and `runner.ts` (`node:vm`
  export-surface discovery, since ESM cannot declare exports dynamically).
- `src/entrypoints/cli.ts` + `bin/plgg-bundle.mjs` — the CLI; the bin installs a
  self-alias resolver hook (`bin/hook.mjs`) and runs the TS CLI under Node's
  native type-stripping.

## Usage

Each package carries a `bundle.config.ts` (plain data: entries, formats,
`fileNamePattern`, `external`, `alias`). Run from the package directory:

```
plgg-bundle            # reads ./bundle.config.ts
plgg-bundle my.config.ts
```

See `DEPENDENCY-LOG.md` for the vendor-neutrality decision record and the gaps
carried to the per-package migration (B2).
