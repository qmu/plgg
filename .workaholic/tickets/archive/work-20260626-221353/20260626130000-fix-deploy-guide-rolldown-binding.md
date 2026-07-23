---
created_at: 2026-06-26T13:00:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure, Config]
effort:
commit_hash:
category: Changed
depends_on:
---

# Fix Deploy Guide CI failure: missing linux-x64 rolldown native binding

## Overview

The `Deploy Guide` workflow (`.github/workflows/deploy-guide.yml`) has been
**failing on every push to `main`** since the lockfile-purge commit `443f9e9`
("Purge stale vitest from lockfiles + drop dead parity-gate", PR #46). The
`build` job dies in its "Build package dists (dependency order)" step at the
first non-core package (`plgg-http`):

```
Error: Cannot find native binding ... Cannot find module '@rolldown/binding-linux-x64-gnu'
npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828).
Please try `npm i` again after removing both package-lock.json and node_modules directory.
```

Root cause (verified): `443f9e9` regenerated every dependent package's
`package-lock.json` on a **darwin-arm64** host. npm pruned the other platforms'
optional native-binding nodes from each lockfile's `packages` section — the
lockfiles now carry an installable node (with `resolved`/`integrity`) for
**only** `@rolldown/binding-darwin-arm64`. Every other platform binding,
including `@rolldown/binding-linux-x64-gnu`, survives only as a bare
`optionalDependencies` reference with no installable node. On the linux-x64 CI
runner, `npm install` reads the lockfile, finds no node for the linux binding,
skips it, and rolldown (vite's bundler) then can't load its native binding.

This is npm's well-known optional-dependency lockfile-platform-skew bug
(npm/cli#4828). It is **deterministic**: it will break every future docs deploy
until fixed. Production is not currently down — `https://qmu.github.io/plgg/`
still serves the last good deploy (PR #45) — but the docs site is now frozen at
that revision.

**Scope is contained to `deploy-guide.yml`.** `run-tests.yml` is green: it only
builds `packages/plgg` and `packages/plgg-test`, neither of which trips the
missing-binding path on linux. Only the Deploy Guide build loop installs all ten
packages on a linux runner, so it is the only workflow that hits the skew.

Regenerating the committed lockfiles to carry all-platform binding nodes is not
feasible from the maintainer's environment (an aarch64/arm64 host would just bake
in the linux-arm64 binding instead of linux-x64), and a `npm install` build step
gains nothing from a lockfile anyway. The fix belongs in the workflow.

## Key Files

- `.github/workflows/deploy-guide.yml` — the `build` job's "Build package dists
  (dependency order)" step runs `(cd "packages/$pkg" && npm install && npm run build)`
  in a loop. This is where the install must re-resolve optional deps for the
  runner platform.

## Implementation Steps

1. In the `deploy-guide.yml` build loop, drop each package's stale lockfile
   immediately before installing, so npm re-resolves optional native bindings
   for the linux-x64 runner:
   `(cd "packages/$pkg" && rm -f package-lock.json && npm install && npm run build)`.
   This is exactly the remedy npm's own error message prescribes, and it changes
   no reproducibility guarantee the step already had (it uses `npm install`, not
   `npm ci`).
2. Add a short comment above the loop explaining the npm/cli#4828 skew so a
   future reader does not "restore" the lockfile use and reintroduce the break.

## Considerations

- **Self-verifying:** merging this PR triggers `Deploy Guide` on `main`; a green
  run for the merge commit (and `https://qmu.github.io/plgg/` rendering the
  current content) is the confirmation. No separate verification harness needed.
- **Durable alternative (out of scope, note for later):** the root rot is the
  darwin-only lockfiles. A follow-up could regenerate all package lockfiles in a
  linux CI job (or drop the committed lockfiles for these build-only packages
  entirely) so any future linux tooling that does honor the lockfile stays sound.
  This ticket fixes the immediate, deterministic deploy break with the smallest
  blast radius.
- **Do not** touch `run-tests.yml` (green) or the CalVer release pipeline
  (`prepare-release.yml` / `release.yml`, both green and CI-owned).
