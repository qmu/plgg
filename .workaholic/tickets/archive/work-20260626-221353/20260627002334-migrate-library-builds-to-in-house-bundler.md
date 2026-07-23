---
created_at: 2026-06-27T00:23:34+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure, Config]
effort:
commit_hash: 4ece26d
category: Changed
depends_on: [20260627002333-bundler-foundation-poc-against-plgg-core.md]
---

# Migrate every library `vite build` to the in-house bundler

## Overview

With the bundler proven on `plgg` core (foundation ticket), cut over **every
remaining library package's `build` script** from `vite build` to the in-house
bundler, reproducing each package's current dist exactly. This is the per-package
migration phase — analogous to the nine per-package vitest→plgg-test migrations,
which each "swapped scripts/devDeps, cleaned the vite config" one package at a
time.

Packages in scope (all that build a library dist): `plgg-kit`, `plgg-http`,
`plgg-router`, `plgg-view`, `plgg-server`, `plgg-fetch`, `plgg-sql`,
`plgg-foundry`, and `plgg-test` (its published dist API, not its runner). `plgg`
core is already done by the foundation ticket. The `example` app bundle + dev
server are handled separately (next ticket); the `guide`'s VitePress is out of
scope.

The bundler config for each package must reproduce the specific shape its
`vite.config.ts` declares today (catalogued in discovery):

- **Single-entry, per-file dts** (default): `plgg-http`, `plgg-router`,
  `plgg-sql` — `{index}`, no externals (plgg-http/router/sql), minify,
  rollupTypes:false.
- **Rolled-up dts**: `plgg-kit` (no minify, rollupTypes:true) and `plgg-foundry`
  (no minify, rollupTypes:true, and **not** in `build.sh`'s ordered set today).
- **Multi-entry + node externals + case-collision renames**: `plgg-server`
  (entries index/node/bun/deno/**ssgEntry**; externals `node:http`,
  `node:stream`, `node:fs/promises`, `node:path`) and `plgg-view`
  (entries index/client/**styleEntry**). The `styleEntry`/`ssgEntry` output keys
  exist so `dist/styleEntry.*` / `dist/ssgEntry.*` don't case-collide with the
  `dist/Style/` / `dist/Ssg/` declaration trees (the U0 fix) — the public
  `./style` and `./ssg` `exports` subpaths still point at them.
- **Predicate external**: `plgg-fetch` (`isFrameworkDep` matching `plgg`,
  `plgg/*`, `plgg-server`, `plgg-server/*`).

## Policies

The standard engineering policies that govern this ticket. The implementing
session **MUST** read each linked policy hard copy before writing code.

- `workaholic:implementation` / `policies/directory-structure.md` — per-package
  layout stays conventional; outputs land in each `dist/` as today.
- `workaholic:implementation` / `policies/coding-standards.md` — any new config
  TypeScript obeys the no-escape-hatch house rule.
- `workaholic:implementation` / `policies/vendor-neutrality.md` — this is the
  payload of the sovereignty move: removing the external build tool per package.
- `workaholic:implementation` / `policies/command-scripts.md` — keep the
  canonical runner: each package's npm `build` stays the entry point and
  `scripts/build.sh` keeps orchestrating; do not add bespoke per-package shell
  scripts. CI and developers invoke identical commands.
- `plgg-coding-style` skill + `CLAUDE.md` — house style, Prettier printWidth 50.

## Key Files

- `packages/plgg-view/vite.config.ts` + `packages/plgg-view/package.json` — the
  3-entry `styleEntry` case-collision case; `./style` subpath mapping.
- `packages/plgg-server/vite.config.ts` + `packages/plgg-server/package.json` —
  5-entry multi-runtime + `node:*` externals + `ssgEntry` rename; `./node`,
  `./bun`, `./deno`, `./ssg` subpaths.
- `packages/plgg-fetch/vite.config.ts` — the only predicate-function external.
- `packages/plgg-kit/vite.config.ts`, `packages/plgg-foundry/vite.config.ts` —
  the two `rollupTypes:true` rolled-up-dts cases.
- `packages/plgg-http/vite.config.ts`, `packages/plgg-router/vite.config.ts`,
  `packages/plgg-sql/vite.config.ts` — straightforward single-entry cases.
- `packages/plgg-test/vite.config.ts` + `package.json` — its dist library build
  (externals `plgg`, `/^node:/`); keep the runner untouched.
- `scripts/build.sh` — dependency order to preserve; decide whether to add
  `plgg-foundry` (currently absent) now that builds are in-house.

## Related History

- [20260624141701-u2-migrate-plgg-fetch.md](.workaholic/tickets/archive/work-20260624-135934/20260624141701-u2-migrate-plgg-fetch.md) — representative per-package vitest→plgg-test migration; same surface (package.json scripts, devDeps, config) this touches per package.
- [work-20260624-135934.md](.workaholic/stories/work-20260624-135934.md) — the migration-recipe-consistency pattern (apply the same cutover recipe across every package) that kept that trip coherent.

## Implementation Steps

1. Migrate packages in `build.sh` dependency order so each downstream package
   builds against in-house-built upstream dist: plgg-kit → plgg-http →
   plgg-router → plgg-view → plgg-server → plgg-fetch → plgg-sql, then
   plgg-foundry and plgg-test.
2. Per package: author the bundler config equivalent to its `vite.config.ts`
   (entries, formats, externals, minify, dts mode), swap the `build` (and any
   `publish`) script from `vite build` to the bundler, and `rm` the
   `vite.config.ts` once parity is confirmed.
3. After each package, diff `dist/` against the prior vite output and run that
   package's plgg-test suite (and `scripts/check-all.sh` for cross-package
   resolution) to confirm no regression.
4. Pay special attention to: the `styleEntry`/`ssgEntry` case-collision renames
   (must survive), the predicate external in plgg-fetch, and the rolled-up dts
   for plgg-kit/plgg-foundry.
5. Leave vite/vite-plugin-dts devDeps and lockfile entries in place for now — the
   final purge ticket (B4) removes them repo-wide behind a grep gate.

## Considerations

- Cross-package `file:` resolution depends on each upstream `dist/` matching its
  `package.json` `exports`; a single mismatched output name breaks downstream
  builds — diff every package's dist before moving on (`scripts/check-all.sh`).
- `plgg-foundry` is currently **excluded** from `scripts/build.sh`; decide
  whether to fold it into the ordered build now (its dist would then be a
  build-order dependency) or keep it ad-hoc.
- The case-collision renames (`packages/plgg-view/src/styleEntry.ts`,
  `packages/plgg-server/src/ssgEntry.ts`) were a deliberate U0 fix; the bundler
  must preserve the output-key naming or the `./style`/`./ssg` subpaths break on
  case-insensitive filesystems.
- Depends on the foundation ticket's bundler covering all five shapes above; if
  any shape is unsupported, that gap blocks the corresponding package here.
