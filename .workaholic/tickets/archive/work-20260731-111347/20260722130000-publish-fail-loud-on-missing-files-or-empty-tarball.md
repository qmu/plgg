---
created_at: 2026-07-22T13:00:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort: 1h
commit_hash:
category: Changed
depends_on: []
claim: work-20260731-111347
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

## Final Report

Development completed as planned, with one scope point the ticket did not
state explicitly (see the first insight): the checks had to move ahead of the
whole publish loop, not merely ahead of each package's own publish.

### Discovered Insights

- **Insight**: A per-package preflight would not have fixed this. `runPublishSet`
  interleaved stage → publish → stage → publish, so a check placed "before the
  publish" still runs *after* every earlier package has already published
  irreversibly. The fix splits the loop into two phases — stage-and-check the
  entire set, then publish the entire set — which is what makes the guarantee
  hold for package five, not just package one.
  **Context**: Anyone adding a further publish-time assertion must keep it in
  phase 1. Putting it in the publish loop silently narrows the guarantee back to
  "the first package is safe", and nothing in the tests would notice.

- **Insight**: `npm pack` masks a broken `files` allowlist, which is why the
  existing dry-run path never caught `plggmatic@0.2.1`. npm's no-`files` default
  packs the whole directory, so a local pack of the *source* dir looks complete,
  while the publisher packs a *stage* that copies only the allowlist. The two
  disagree exactly when the allowlist is missing.
  **Context**: A local `npm pack` is not evidence that a publish will be
  well-formed. The staged dir is the only artifact worth asserting against, and
  it is what the new check inspects.

- **Insight**: `exports` has no single shape in this repo. `plgg` uses bare
  `import`/`require` conditions with no `"."` key; `plggmatic`/`plggpress` use
  subpath keys over condition maps; `plgg-bundle` is bin-only with no importable
  surface at all. A reader that assumes `exports["."]` sees nothing for `plgg`.
  **Context**: `entryTargets` walks every string leaf rather than pattern-matching
  a shape, and skips `null` (a blocked subpath) and `*` (a pattern, not a path).
  Any future manifest reader in `scripts/` should do the same.
