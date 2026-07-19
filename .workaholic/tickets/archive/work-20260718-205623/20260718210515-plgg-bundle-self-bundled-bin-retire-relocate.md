---
created_at: 2026-07-18T21:05:15+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Removed
depends_on:
mission: modernize-plgg-bundle
---

# plgg-bundle bin runs from a compiled dist; retire relocate.mjs

## Overview

plgg-bundle's bin runs **from source**: `bin/plgg-bundle.mjs` registers the
self-alias hook and `import()`s `src/entrypoints/cli.ts` directly, relying on
Node's `.ts` type-stripping — which is forbidden under `node_modules`
(`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`). To survive a real registry
install it uses `bin/relocate.mjs`: a `/tmp` copy-and-re-exec hack (cache keyed
`sha1(depsNodeModules)`, `.plgg-relocate-ready` marker, deps symlink recreated
each run). This **silently masked hot-patched sources** during the PR #66
golden check and adds startup latency for every consumer.

plgg-bundle can bundle itself. Ship a **compiled dist** and run the bin from it
(developer decision 2026-07-18: **plgg-bundle only** this ticket — the shared
copies in plgg-test/plggpress/plgg-cms are a separate follow-on). Delete
`relocate.mjs` and the `/tmp` relocate cache.

## Key files

- `packages/plgg-bundle/bin/plgg-bundle.mjs` — launcher (relocate → register
  hook → `import(../src/entrypoints/cli.ts)`).
- `packages/plgg-bundle/bin/relocate.mjs` — the hack to delete (plgg-bundle's
  copy).
- `packages/plgg-bundle/package.json` — `"files": ["src","bin"]` (ships raw
  src, no dist), `"bin": {"plgg-bundle": "bin/plgg-bundle.mjs"}`, `build:
  "tsc"`.
- `packages/plgg-bundle/bundle.config.ts` — add/point a self-bundle config so
  plgg-bundle builds its own CLI to `dist/`.

## Approach

- Give plgg-bundle a **self-bundle build**: `build` produces a compiled
  `dist/` (the CLI + its `node:*`/`typescript` externals) using plgg-bundle
  itself (bootstrapped `tsc` for the very first build if needed).
- `bin/plgg-bundle.mjs` launches the **compiled** `dist` entrypoint (no
  type-stripping at runtime, so no relocate, no self-alias `.ts` hook needed
  for the bin path). Ship `dist` in `"files"`.
- Delete `packages/plgg-bundle/bin/relocate.mjs` and remove its call; drop the
  `/tmp` relocate cache logic. The `appAliasHook.mjs`/`hook.mjs` stay only if
  still needed for `bundle.config.ts` loading (see the typeless-loader ticket).

## Quality Gate

- **Acceptance:** in a **real registry-style install** (`npm install` the
  packed tarball into a scratch dir under `node_modules`), `plgg-bundle --help`
  and a real `plgg-bundle` build both run with **no `relocate.mjs` present** and
  **no `/tmp/plgg-relocate-*` directory created** — reproduce the
  `publish-npm.sh` bin smoke and confirm it passes without the relocate path.
- `relocate.mjs` is **deleted** from `packages/plgg-bundle/bin/` and no code
  references it; `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` can no longer
  occur for the bin because it runs compiled JS.
- **No stale-copy trap:** editing `src` then rebuilding is reflected on the
  next run (the masking bug that bit PR #66 is structurally gone).
- Every package still builds via plgg-bundle (`scripts/build.sh` green);
  `scripts/check-all.sh` green; no new dependency.

## Policies

- `workaholic:design` / `vendor-neutrality` (self-bundle with the project's own
  toolchain; no new dep); `sacrificial-architecture` (the durable tool sheds a
  fragile bootstrap hack).
- `workaholic:implementation` / `objective-documentation` (verified by a real
  install smoke, not by inspection).
- `workaholic:operation` / `recovery` (removing the silent stale-copy mask
  makes verification trustworthy).
