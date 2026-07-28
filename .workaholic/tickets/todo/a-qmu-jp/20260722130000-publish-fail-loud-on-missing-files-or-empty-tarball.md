---
created_at: 2026-07-22T13:00:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Changed
depends_on: []
---

# Publish must fail loudly when a package can't stage its dist

## Overview

`plggmatic@0.2.1` published to npm **broken** — with no `dist/` — and the
irreversible publish only surfaced at the post-publish smoke test
(`import('plggmatic')` → `ERR_MODULE_NOT_FOUND` for `dist/index.es.js`).

Root cause: `scripts/stagePackage.ts` (`stagedEntries`) copies **only the
package's `files` allowlist** into the publish stage. `plggmatic` was the one
publishable package with **no `files` field**, so `files` was absent, its `dist`
was never staged, and `publish.ts` published an empty-of-dist tarball. A *local*
`npm pack` masked it (npm's no-`files` default packs everything), so nothing
caught it before the registry.

## Key files

- `scripts/stagePackage.ts` (`stagedEntries` — the `files` allowlist read).
- `scripts/publish.ts` (`publishStaged` / the stage → publish → verify flow).

## Approach

Make the publisher **fail before `npm publish`**, not at the post-publish smoke:

1. A publishable (non-`private`) package with **no `files` field** is a hard
   preflight error (every sibling declares `files: ["dist"]`; the absence is
   always a mistake, never intent).
2. Before publishing a staged dir, assert the stage actually contains the
   targets its `package.json` `main`/`exports` point at (e.g. `dist/index.es.js`)
   — a staged tarball missing its entry point aborts the run with a clear
   message naming the package and the missing path.

## Quality Gate

- **Acceptance:** a publishable package with no `files` field, or whose staged
  tarball omits a `main`/`exports` target, aborts the publish run **before** the
  irreversible `npm publish`, with a message naming the package and the missing
  path — verified by a `stagePackage`/preflight unit test over both shapes. The
  existing publish path for correctly-declared packages is unchanged.

## Policies

- `workaholic:operation` (ci-cd, fault-tolerance) — an irreversible publish must
  be gated by a pre-publish check, not discovered after the fact.
- `workaholic:implementation` (objective-documentation) — the failure names the
  exact package + path.
