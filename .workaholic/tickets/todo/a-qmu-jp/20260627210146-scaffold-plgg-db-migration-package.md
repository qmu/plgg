---
created_at: 2026-06-27T21:01:46+09:00
author: a@qmu.jp
type: enhancement
layer: [Config, Domain]
effort:
commit_hash:
category:
depends_on:
---

# Scaffold the `plgg-db-migration` package (bundler, test, layout, CLI launcher)

## Overview

Create the new monorepo package `packages/plgg-db-migration/` as an empty,
buildable shell that the subsequent tickets fill in. It is built by the in-house
`plgg-bundle` (no vite) and tested by `plgg-test` (>90% gate), and its runtime
dependencies are only `plgg` and `plgg-sql` — **zero new external
dependencies, no native binding**. Model the package shape on `plgg-bundle`
(it is the current CLI-package precedent: `bin/` launcher + `src/entrypoints/`).

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — new package
  under `packages/`; `src/{domain/{model,usecase},entrypoints,vendors}` split;
  pronounceable names.
- `workaholic:implementation` / `policies/coding-standards.md` — own
  `.prettierrc.json` (`printWidth: 50`); the three-part `src/` layout; no
  `as`/`any`/`ts-ignore`.
- `workaholic:implementation` / `policies/vendor-neutrality.md` — dependencies
  limited to `plgg` + `plgg-sql` + the project's own `typescript`/`plgg-bundle`/
  `plgg-test`; no driver, no native binding.

## Trip Origin

`.workaholic/trips/plgg-db-migration/designs/design-v1.md` §1.3 (component
inventory / package layout) and §4 step 1 (package scaffold).

## Key Files

- `packages/plgg-bundle/package.json`, `packages/plgg-bundle/bin/plgg-bundle.mjs`,
  `packages/plgg-bundle/src/entrypoints/cli.ts` - **CLI-package precedent** for
  `bin` launcher, `type: module`, the self-alias hook, and the dynamic-import of
  a `.ts` config.
- `packages/plgg-sql/package.json`, `packages/plgg-sql/bundle.config.ts`,
  `packages/plgg-sql/plgg-test.config.json`, `packages/plgg-sql/tsconfig*.json`,
  `packages/plgg-sql/.prettierrc.json` - **library-package precedent** for the
  bundler config, test threshold (91), tsconfig split, and alias prefix.
- `scripts/` - repo-wide runners (`tsc-plgg.sh`, `test-plgg.sh`); wire the new
  package in.

## Implementation Steps

1. `packages/plgg-db-migration/package.json`: `name: plgg-db-migration`,
   `dependencies: { plgg: "file:../plgg", "plgg-sql": "file:../plgg-sql" }`,
   `devDependencies` mirroring plgg-sql (`@types/node`, `plgg-bundle`,
   `plgg-test`, `typescript`); a `bin` entry `plgg-db-migration` →
   `bin/plgg-db-migration.mjs`; scripts (`build: plgg-bundle`, `tsc`, `test`,
   `coverage`) copied from plgg-sql.
2. `tsconfig.json` + `tsconfig.build.json` with `paths: { "plgg-db-migration*":
   ["./src/*"] }` (mirror plgg-sql's alias setup).
3. `.prettierrc.json` (`printWidth: 50`) and `plgg-test.config.json`
   (`threshold: 91`, exclude `/index.ts`).
4. `bundle.config.ts`: single `index` entry, es+cjs, alias prefix
   `plgg-db-migration`, `srcRoot: "src"` (copy plgg-sql's, adjust names).
5. `bin/plgg-db-migration.mjs`: the self-alias resolver hook + launcher handing
   off to `src/entrypoints/cli.ts` (copy plgg-bundle's `bin` + `hook.mjs`
   pattern, adjust the alias prefix and CLI path).
6. `src/index.ts` empty barrel (re-exports added by later tickets). A placeholder
   `src/entrypoints/cli.ts` that exits cleanly until the CLI ticket fills it.
7. Wire the package into `scripts/tsc-plgg.sh` / `scripts/test-plgg.sh` and any
   monorepo install/build script, matching how plgg-sql is wired.
8. `scripts/tsc-plgg.sh` green for the new package.

## Considerations

- Do not copy plgg-sql's older `src/<Module>/{model,usecase}` layout — use the
  current `src/domain/{model,usecase}` + `vendors` + `entrypoints` standard
  (the layout `plgg-bundle` uses) (`packages/plgg-db-migration/src/`).
- Migration `.sql` files are **project data**, not package files — they live in
  the consuming repo's `databases/<db>/migrations/` slot, never inside this
  package (`packages/plgg-db-migration/`).
- Keep the `bin/hook.mjs` alias prefix correct (`plgg-db-migration/*`), or the
  CLI's `import` of `src/...` specifiers will not resolve at runtime
  (`packages/plgg-db-migration/bin/`).
</content>
