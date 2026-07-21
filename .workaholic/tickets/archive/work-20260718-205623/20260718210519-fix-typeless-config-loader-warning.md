---
created_at: 2026-07-18T21:05:19+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Changed
depends_on:
mission: modernize-plgg-bundle
---

# Silence MODULE_TYPELESS_PACKAGE_JSON structurally in the config loader

## Overview

Every package build runs `plgg-bundle` → `cli.ts` `loadConfig`, which
`import(pathToFileURL(bundle.config.ts))` — a `.ts` file Node type-strips and
resolves as ESM. Node emits `MODULE_TYPELESS_PACKAGE_JSON` because the nearest
`package.json` (the package's own) has **no `"type"` field**: 20 of the
non-private packages lack it. The warnings spew to stderr on `build.sh` and are
not gated.

Developer decision 2026-07-18: fix it **in the loader** (one file in
plgg-bundle), not by editing 20 manifests and not by suppressing stderr — change
how `bundle.config.ts` is loaded so Node never resolves a typeless module.

## Key files

- `packages/plgg-bundle/src/entrypoints/cli.ts` — `loadConfig`
  (lines ~61–76): `resolve(cwd, "bundle.config.ts")` → `import(pathToFileURL
  (configPath))` → `asBundleConfig(pickDefault(mod))`.
- `packages/plgg-bundle/src/vendors/transpiler.ts` — the vendored TS transpile
  seam to reuse.
- `packages/plgg-bundle/src/domain/usecase/asBundleConfig.ts` — the config
  validator (unchanged contract).

## Approach

- Load the config by **transpiling it with the vendored `typescript` and
  evaluating the result** (e.g. transpile `bundle.config.ts` → JS, then load
  via a `data:` URL or a written temp `.mjs` whose adjacent `package.json`
  declares `"type":"module"`, or `vm`), so Node never resolves the user's
  typeless `package.json` for module-type inference. Preserve the current config
  surface: `export default`, `import.meta.dirname`, and any imports the existing
  configs use.
- The warning must be gone **structurally** — not `NODE_NO_WARNINGS`, not
  stderr filtering.

## Quality Gate

- **Acceptance:** `scripts/build.sh` (a full rebuild of every package) emits
  **zero** `MODULE_TYPELESS_PACKAGE_JSON` lines — grep the build output and
  confirm none. No `package.json` `"type"` fields were added to the 20
  packages, and no stderr suppression is used (verify the fix is in the loader).
- **Config surface preserved:** every existing `bundle.config.ts` still loads
  and produces the same `BundleConfig` (`asBundleConfig` accepts it,
  `import.meta.dirname`/`export default` still work); all packages still build.
- Add a spec for `loadConfig` over a fixture `bundle.config.ts` asserting it
  loads without the warning path; `scripts/check-all.sh` green; no new dep.

## Policies

- `workaholic:implementation` / `objective-documentation` (verified by grepping
  the build output for zero warnings, not by "looks clean").
- `workaholic:design` / `vendor-neutrality` (reuse the vendored `typescript`;
  no new dep); `workaholic:operation` / `observability` (a clean build log is
  the baseline signal).
