---
title: plgg npm packages (script-driven from /ship)
environment: production
confirmation_method: api-probe
url: https://www.npmjs.com/package/plgg
---

# Deployment: plgg npm packages

Per-package npm publishing is **script-driven from this host** via the
canonical `scripts/publish-npm.sh`, per the local CI/CD policy — no hosted
CI in the publish path, no `--provenance` (it requires hosted-CI OIDC; the
same trade-off the GitHub Release contract makes). The registry is treated
as the production origin: every publish is bracketed by online verification
against it.

## Procedure

At ship time (post-merge step of the `/ship` flow, after the GitHub Release),
or standalone with explicit developer consent:

1. `./scripts/publish-npm.sh` — gates on a fresh green `check-all.sh`
   (`SKIP_GATE=1` when one just ran green in the same session), builds
   plgg-bundle's tsc dist, then walks build.sh's dependency topology.
2. Per non-private package it publishes **only when the local version exceeds
   the registry version** (publish-if-newer; re-runs are all-skip no-ops),
   staging a copy whose `file:` cross-deps are rewritten to `^<local version>`
   — the working tree is never mutated.

**Versioning policy** (decided 2026-07-03, resolving the standing
monorepo-versioning concern): independent per-package semver, unscoped
`plgg-*`/`plggmatic`/`plggpress` names. Releasing a package = bump its
`version` in `packages/<pkg>/package.json` on a work branch; the next ship
publishes it.

## Confirmation

Executed by the script itself, per package (a failure aborts the run):

1. `npm view <name>@<version>` resolves on the registry (polled up to 60s).
2. A scratch-dir consumer `npm install <name>@<version>` succeeds
   (overriding the host's `min-release-age` for the just-published artifact)
   and `import('<name>')` loads; packages with a bin also run `--help` and
   must show no module-resolution failure.

Manual spot-check: https://www.npmjs.com/package/plgg (and siblings) show the
new version.

## Notes

- Auth is the ambient `~/.npmrc` of the executing host (`npm login`), never
  committed, never placed in this file.
- npm output must be redirected to a file on this host (a 2026-07-03 quirk:
  npm hangs writing to some capture pipes) — run the script in the
  background with output to a log, e.g. `./scripts/publish-npm.sh > /tmp/publish.log 2>&1`.
- `example` and `guide` are `private: true` and are skipped by flag, not by
  name-list.
