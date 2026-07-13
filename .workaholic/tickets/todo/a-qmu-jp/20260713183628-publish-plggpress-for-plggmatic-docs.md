---
created_at: 2026-07-13T18:36:28+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 0.5h
commit_hash:
category:
depends_on:
mission:
---

# Publish plggpress (bump 0.0.3 → 0.0.4) so plggmatic's documentation can consume the current source

## Overview

Developer directive (2026-07-13): plggmatic's documentation site depends
on plggpress from npm, and it needs the CURRENT plggpress — but the
registry is stale. `plggpress@0.0.3` is already published (set in commit
`efc6a4ce`), and `packages/plggpress/src` has since drifted at least two
commits (`807a422c` "Retire plgg-ui and plgg-domain package boundaries",
`6c6d84d9` "Clean guide output before building"). npm cannot republish the
same version, so delivering the current plggpress means **bumping to
0.0.4 and republishing**.

This is a release-enablement chore on `main`'s plggpress, deliberately
kept OFF the PoC 4 branch (PR #67). The actual `npm publish` is
DEVELOPER-DRIVEN — `scripts/publish-npm.sh` never publishes on the
agent's behalf; this ticket's /drive prepares the bump + gate and hands
the developer the one command to run.

## Policies

- `workaholic:operation` / `policies/ci-cd.md` (Local CI/CD Execution) —
  releases are repository scripts run from the developer's host, bracketed
  by online verification against the registry (the registry IS
  production). Reuse `scripts/publish-npm.sh`; do not hand-roll `npm
  publish` calls.
- `workaholic:operation` / `command-scripts` — no bespoke per-package
  publish script; the canonical `publish-npm.sh` already computes the
  local>registry publish set in build.sh's dependency order.
- `workaholic:design` / `vendor-neutrality` — publishing our own
  foundation packages is the giving-back half of the policy; keep the
  published surface (`exports` `.` + `./framework`, `files: dist/src/bin`)
  intact.

## Key Files

- `packages/plggpress/package.json` - bump `version` 0.0.3 → 0.0.4 (the
  ONLY source edit this ticket makes)
- `scripts/publish-npm.sh` - the canonical publisher; `PREFLIGHT=1` lists
  the set, a bare run gates→stages→publishes→verifies. Developer-run.
- `scripts/build.sh` - defines the publish topology publish-npm.sh derives
- `packages/plggpress/package-lock.json` - refreshed by npm-install after
  the bump if needed

## Related History

- `20260703000542-plggpress-consume-thick-plggmatic.md` (archive) and the
  release-flow tickets — plggpress is a thin plggmatic consumer; the
  publish path is the same script-driven `/ship` flow.
- The `modernize-plgg-bundle` mission tracks bundler/publish modernization
  separately — do NOT fold bundler work in here; this is a plain version
  bump + republish.

## Implementation Steps

1. On this branch (off main), bump `packages/plggpress/package.json`
   `version` to `0.0.4`. Run `scripts/npm-install.sh` (or a scoped
   install) if the lockfile needs to reflect the bump.
2. Run `PREFLIGHT=1 ./scripts/publish-npm.sh` and CONFIRM the reported
   publish set contains `plggpress` (local 0.0.4 > registry 0.0.3). If the
   preflight also lists plggpress's dependencies (plgg, plgg-http,
   plgg-server, plgg-view, plgg-md, plgg-highlight, plgg-cli) as bumped,
   record that in the ticket — but do NOT bump those here unless plggpress
   would otherwise fail to resolve; scope this ticket to plggpress.
3. Run `scripts/check-all.sh` (fresh, ~4 min) — the publish gate must be
   green before the developer publishes.
4. **Hand off to the developer**: report that `./scripts/publish-npm.sh`
   is ready to run (needs their ambient `~/.npmrc` auth / 2FA). The agent
   does NOT run it.
5. After the developer publishes, VERIFY: `npm view plggpress version`
   returns `0.0.4`, and publish-npm.sh's own scratch-dir install +
   import/bin smoke passed. Then note in plggmatic that it can bump its
   plggpress dependency to `^0.0.4`.

## Quality Gate

**Acceptance criteria:**

- `packages/plggpress/package.json` version is exactly `0.0.4`; no other
  plggpress source change rides on this branch.
- `PREFLIGHT=1 ./scripts/publish-npm.sh` lists `plggpress` in the publish
  set (proves local>registry).
- `scripts/check-all.sh` exits 0 on this branch before any publish.

**Verification method:**

- Pre-publish (agent): the two checks above + a clean `git diff main..HEAD
  --stat` showing only the version bump (+ lockfile).
- Publish (developer-run): `./scripts/publish-npm.sh` completes its
  stage→publish→verify for plggpress.
- Post-publish (agent): `npm view plggpress version` == `0.0.4`; a
  throwaway `npm i plggpress@0.0.4` in a scratch dir imports `plggpress`
  and `plggpress/framework` without error (publish-npm.sh already does
  this, but re-confirm).

**Gate (before approval):**

- check-all green, working tree clean apart from the version bump, and the
  PREFLIGHT set confirmed. Actual publish + the post-publish npm-view
  verification is the developer's step at approval time (the release is
  never auto-run).

## Considerations

- **Dependency resolvability**: plggpress@0.0.4's published `file:`-deps
  get rewritten to `^<local version>`. Those versions must already be on
  the registry (plgg 0.0.27, plgg-http 0.0.2, plgg-server 0.0.4, plgg-view
  0.0.2, plgg-md 0.0.2, plgg-highlight 0.0.3, plgg-cli 0.0.1 are all
  present as of 2026-07-13). If the drifted plggpress source now imports a
  symbol NOT in those published dep versions, the scratch-install smoke
  will catch it — surface that as a blocker rather than silently bumping
  the dep chain.
- **Not on the PoC 4 branch**: this deliberately targets main's plggpress;
  keep PR #67 (PoC 4) unrelated.
- **CalVer vs SemVer**: plggpress uses 0.0.x SemVer-ish patch bumps (not
  the CalVer the release tags use); 0.0.4 is the next patch.
