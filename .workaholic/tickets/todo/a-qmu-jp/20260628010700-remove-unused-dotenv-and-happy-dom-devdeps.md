---
created_at: 2026-06-28T01:07:00+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort:
commit_hash:
category:
depends_on:
---

# Remove the unused `dotenv` and `happy-dom` leftover devDeps

## Overview

Three packages declare a development dependency that nothing actually uses —
dead weight that contradicts the repo's vendor-neutrality / smaller-better
posture (the same posture that just shed vite). Discovery confirmed:

- **`dotenv` (`^17.4.2`)** is a devDep of **`plgg-foundry`** and **`plgg-kit`**,
  but is **not imported or required anywhere in code**, and no script uses a
  `-r dotenv/config` / `--import dotenv/config` flag. The only reference is one
  illustrative snippet in `plgg-kit/README.md` (`import dotenv from 'dotenv';
  dotenv.config();`). Node 24 (the repo's runtime) has native env-file support
  (`node --env-file=.env` / `process.loadEnvFile()`), so dotenv is unnecessary.
- **`happy-dom` (`^15.0.0`)** is a devDep of **`plgg-server`**, but plgg-server
  has **no `happy-dom` import and no `// @vitest-environment happy-dom` pragma**
  in its specs — server code needs no DOM. (happy-dom is legitimately used by
  `plgg-view` and `packages/example` via the env pragma, and is *provided* by
  `plgg-test`'s DOM environment — those three keep it.)

Scope (confirmed with the requester): **remove the unused declarations only** —
no new feature, no plgg-bundle change. Drop the three devDep entries, rewrite the
kit README example to Node-native env loading, regenerate the affected lockfiles,
and prove the references are gone with the suites still green.

## Policies

- `workaholic:implementation` / `policies/vendor-neutrality.md` — shedding
  unused external dependencies (smaller-better; fewer supply-chain surfaces); no
  replacement dependency is added.
- `workaholic:operation` / `policies/ci-cd.md` — regenerate the affected
  `package-lock.json` deterministically; `scripts/check-all.sh` must stay green
  with the same commands developers run.
- `workaholic:implementation` / `policies/objective-documentation.md` — the kit
  README must show env loading that actually works post-removal (Node-native),
  not a dependency that no longer exists.
- `workaholic:implementation` / `policies/directory-structure.md` — package
  layout unchanged; only manifest + lockfile + one README edit.

## Key Files

- `packages/plgg-foundry/package.json` (line ~46: `dotenv` devDep) +
  `packages/plgg-foundry/package-lock.json`.
- `packages/plgg-kit/package.json` (line ~45: `dotenv` devDep) +
  `packages/plgg-kit/package-lock.json`.
- `packages/plgg-kit/README.md` (lines ~168–169: the `import dotenv` example to
  rewrite to `process.loadEnvFile()` / a `--env-file` note).
- `packages/plgg-server/package.json` (line ~87: `happy-dom` devDep) +
  `packages/plgg-server/package-lock.json`.

## Implementation Steps

1. Remove the `dotenv` devDep from `plgg-foundry/package.json` and
   `plgg-kit/package.json`.
2. Remove the `happy-dom` devDep from `plgg-server/package.json`. **Do not**
   touch happy-dom in `plgg-view`, `plgg-test`, or `example` (legitimately used).
3. Rewrite the `plgg-kit/README.md` env example to Node-native loading
   (`process.loadEnvFile()` or a `node --env-file=.env` note) — no dotenv.
4. Regenerate the affected `package-lock.json` files (foundry, kit, server) so
   the removed packages are flushed from the lock graph.
5. Verify: a scoped grep shows zero `dotenv` references in foundry/kit (code,
   scripts, README) and zero `happy-dom` references in plgg-server; happy-dom
   still present where used (view/test/example). Run `scripts/check-all.sh` —
   all packages green.

## Considerations

- happy-dom is NOT globally removable — `plgg-view`/`example` specs rely on it via
  the `@vitest-environment happy-dom` pragma and `plgg-test` provides that DOM
  environment. Only the **plgg-server** declaration is unused; scope the removal
  to it.
- A naive "zero dotenv/happy-dom anywhere" gate would false-positive on the
  legitimate happy-dom users — scope any verification grep per package.
- Lockfile regeneration must not pull a native-binding tool back in (it won't —
  this only removes entries); confirm the locks stay clean.
- No runtime behavior changes: both deps are currently unused, so removal is
  inert beyond a smaller install graph.
