---
created_at: 2026-07-04T13:11:34+09:00
author: a@qmu.jp
type: bugfix
layer: [Config]
effort:
commit_hash:
category:
depends_on:
---

# Fix plggmatic's errant `publish` lifecycle script that breaks publish-npm.sh

## Overview

`packages/plggmatic/package.json` defines a script `"publish": "npm run build && npm publish"`. `publish` is an **npm lifecycle hook** — `npm publish` runs it automatically *after* the tarball is uploaded — so when the canonical `scripts/publish-npm.sh` publishes plggmatic from its `.publish-stage/` copy (`npm publish --tag latest`), npm uploads the tarball and then fires the `publish` hook, which runs `plgg-bundle` (plggmatic's `build`) inside the staging copy where no `node_modules/.bin/plgg-bundle` exists → **exit 127**. It also implies a recursive `npm publish`.

The tarball still uploads (the hook fires post-upload, so `plggmatic@0.1.0` did reach the registry during PR #59's ship), but `publish-npm.sh` exits non-zero and aborts, printing a 127 error and skipping plggmatic's per-package verification. This makes the whole family-publish flow report failure on every run while plggmatic carries that script.

Two-part fix (decided at ticket time): **harden the publisher so no package's publish-time scripts can ever break or recurse the flow, AND remove the errant script**. `publish-npm.sh` already builds every dist via `build.sh` before staging, so no package needs any publish-time lifecycle script — passing `--ignore-scripts` to the staged `npm publish` is safe and immunizes the flow against this entire class of bug.

## Policies

The standard engineering policies that govern this ticket. The implementing session MUST read each linked policy hard copy before writing code and keep every change defensible against that policy's Goal (目標), Responsibility (責務), and Practices (実践).

- `workaholic:operation` / `policies/*` — this is a delivery-path fix: the canonical npm publisher must complete deterministically and not abort mid-family on a package's stray lifecycle hook (Local CI/CD Execution policy owns the publish path)
- `workaholic:implementation` / `policies/directory-structure.md` — conventional layout; the change is confined to `scripts/publish-npm.sh` and one `package.json`
- `workaholic:design` / `policies/sacrificial-architecture.md` — keep the fix a small, revertible change behind the stable publish contract

## Key Files

- `scripts/publish-npm.sh` - line ~106 runs `(cd "$STAGE" && npm publish --tag latest)`; add `--ignore-scripts` so no staged package's lifecycle hooks (`prepublishOnly`/`prepare`/`prepack`/`publish`/`postpublish`) run — the dist is already built by `build.sh` before staging, so nothing legitimate is lost
- `packages/plggmatic/package.json` - remove the `"publish": "npm run build && npm publish"` script entry (the only stray lifecycle script in the monorepo; every other package's `scripts` are build/test/tsc/coverage only)
- `scripts/build.sh` - evidence that every dist (incl. plggmatic) is built before any publish, so publish-time build hooks are redundant
- `.workaholic/deployments/npm.md` - the publish contract (publish-if-newer, per-package registry-resolve + scratch-install verification); the fix must keep that verification intact
- `.workaholic/concerns/59-plggmatic-publish-script-breaks-canonical-publish.md` - the concern this ticket resolves (set `resolved_by_*` on completion)

## Related History

Surfaced during PR #59's ship (the plgg-parser / plgg-highlight release): `publish-npm.sh` published plgg-parser@0.0.1 and plgg-highlight@0.0.2 cleanly, then aborted on plggmatic's `publish` hook.

- [.workaholic/stories/work-20260704-015006.md](.workaholic/stories/work-20260704-015006.md) - PR #59 story; its npm Deployment Evidence documents the plggmatic exit-127 and that the tarball uploaded anyway
- `scripts/publish-npm.sh` was introduced by PR #53 (the npm publishing runner); this hardens it

## Implementation Steps

1. In `scripts/publish-npm.sh`, add `--ignore-scripts` to the staged publish invocation (`npm publish --tag latest --ignore-scripts`). Keep everything else (file:-dep rewrite, publish-if-newer gate, per-package registry-resolve + scratch-install verification) unchanged.
2. Remove the `"publish"` script entry from `packages/plggmatic/package.json`. Leave the standard `build`/`test`/`tsc`/`coverage` scripts intact.
3. Re-run `./scripts/publish-npm.sh` (with valid npm auth): it must exit 0 — plggmatic is now publish-if-newer (`plggmatic@0.1.0` already on the registry from PR #59) so it is re-verified as a safe skip, and no exit-127 fires. Redirect output to a log per `npm.md` (npm hangs on some capture pipes).
4. Resolve the concern: set `resolved_by_pr`/`resolved_by_commit` in `.workaholic/concerns/59-plggmatic-publish-script-breaks-canonical-publish.md` (and move it to `concerns/archive/` if that is the house convention on resolution).

## Quality Gate

How the outcome's quality is assured. `/drive` surfaces this in its approval prompt; approval is against this pre-agreed gate.

**Acceptance criteria** — the checkable conditions that must hold:

- `scripts/publish-npm.sh`'s staged publish passes `--ignore-scripts`; `grep -n 'npm publish' scripts/publish-npm.sh` shows the flag on the publish line.
- No `package.json` under `packages/` defines a `publish`/`prepublish`/`prepublishOnly`/`prepare`/`prepack` lifecycle script (grep clean); plggmatic's `publish` entry is gone.
- A live `./scripts/publish-npm.sh` run exits 0 with plggmatic in the newer-scan set, re-verifying `plggmatic@0.1.0` as a publish-if-newer skip — no exit-127, no recursive publish.
- `scripts/check-all.sh` stays green (the script change does not affect the build/test gate, but confirm no regression).

**Verification method** — the commands/tests/probes that prove them:

- `grep -n 'npm publish' scripts/publish-npm.sh` — shows `--ignore-scripts`.
- `for d in packages/*/; do node -e "const s=require('./$d/package.json').scripts||{}; ['publish','prepublish','prepublishOnly','prepare','prepack'].forEach(k=>s[k]&&console.log('$d',k))"; done` — prints nothing.
- `./scripts/publish-npm.sh > /tmp/publish.log 2>&1` — exit 0; the log shows plggmatic as an all-skip publish-if-newer no-op (or a clean re-publish) with no 127.
- `scripts/check-all.sh` — green.

**Gate** — what must pass before approval:

- All four acceptance criteria met, the live publish re-run green (exit 0, plggmatic no longer errors), and the resolved concern updated.

## Considerations

- `--ignore-scripts` on the staged publish is safe precisely because `build.sh` already built every dist before staging; if a package ever legitimately needed a build-at-pack step it should use `prepack` in-package (with its own `node_modules`), never a `publish` hook — but none do today (`scripts/publish-npm.sh`, `scripts/build.sh`).
- The developer chose harden-plus-cleanup over a minimal single-file delete, and a live-publish gate over static-only — a real `publish-npm.sh` re-run is the proof, so the implementing session needs valid npm auth on the host (`npm whoami` must resolve; the token expired once during PR #59's ship).
- A recurrence-guard gate (`gate-*.sh` scanning for stray lifecycle scripts, wired into `check-all.sh`) was explicitly considered and deferred — the `--ignore-scripts` hardening already neutralizes the impact, so a gate is optional polish, not required here.
- plggmatic is a distinct package on `main` (the UI design framework); this ticket touches only its `package.json` `scripts`, no source or public API.
