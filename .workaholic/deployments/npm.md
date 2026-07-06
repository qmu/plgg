---
title: plgg npm packages (developer-driven publish, ship asks & awaits)
environment: production
confirmation_method: api-probe
url: https://www.npmjs.com/package/plgg
---

# Deployment: plgg npm packages

Per-package npm publishing is a **developer-driven manual step** run from this
host via the canonical `scripts/publish-npm.sh`, per the local CI/CD policy — no
hosted CI in the publish path, no `--provenance` (it requires hosted-CI OIDC; the
same trade-off the GitHub Release contract makes). An npm publish is effectively
**irreversible** (npm forbids re-publishing a version), so at `/ship` the agent
**detects a pending publish and asks the developer to run it, then waits** — it
never publishes on the developer's behalf. The registry is treated as the
production origin: every publish is bracketed by online verification against it.

## Procedure

npm publishing is a **developer-driven, PRE-merge gate** in the `/ship` flow: it
runs **before** the merge (the library packages reach the registry from the
branch first; the merge then deploys the guide and the GitHub Release is
published at/after merge per `release.md`), and it fires **only when a package
version was bumped**. Ordering note: this is a deliberate pre-merge placement
that fits ship's "merge last, confirmation-gated" essence — the developer's
publish + its verification are the branch-level production proof gated *before*
the irreversible merge.

At ship time, **before the merge**:

1. **Preflight — agent, read-only.** The agent runs
   `PREFLIGHT=1 ./scripts/publish-npm.sh`. It compares each non-private package's
   local version against the registry and prints the publish set (and what it
   skips) **without gating, building, or publishing**.
   - **Nothing to publish** (no version bumped past the registry): the agent
     records "nothing to publish" into the story/PR and **continues the ship —
     no prompt**.
   - **One or more packages ready**: continue to step 2.
2. **Ask & wait — agent → developer.** The agent shows the preflight publish set
   and **pauses**, asking the developer to publish themselves (AskUserQuestion /
   the confirm-before-deploy gate). It does **not** proceed until the developer
   confirms the publish is done (or explicitly declines — a decline leaves the PR
   unmerged, mirroring ship's confirmation-gate rollback).
3. **Publish — developer.** The developer runs the canonical
   `./scripts/publish-npm.sh > /tmp/publish-npm.log 2>&1` (background it — npm
   hangs on some capture pipes). The script re-runs the preflight, then — only
   because there is something to publish — gates on a fresh green `check-all.sh`
   (`SKIP_GATE=1` when one just ran green this session), and publishes **only the
   bumped packages** in `build.sh`'s dependency order, each with the staged
   `file:` → `^<local version>` rewrite (the working tree is never mutated) and
   the per-package verification below. A run with nothing bumped never
   builds/gates.
4. **Confirm & continue — agent.** After the developer confirms, the agent runs
   the `## Confirmation` check, records the published `name@version` set into the
   story/PR, and only then continues to the merge + GitHub Release.

**Versioning policy** (decided 2026-07-03, resolving the standing
monorepo-versioning concern): independent per-package semver, unscoped
`plgg-*`/`plggmatic`/`plggpress` names. Releasing a package = bump its
`version` in `packages/<pkg>/package.json` on a work branch; the next ship
detects the bump at preflight and prompts you to publish it. A brand-new package
(absent from the registry) counts as bumped and is surfaced the same way.

## Confirmation

Runs **after the developer's publish, before the merge**. Per published package
the script performs these inline (a failure aborts the run); the agent records
the headline outcome:

1. `npm view <name>@<version>` resolves on the registry (polled up to 60s).
2. A scratch-dir consumer `npm install <name>@<version>` succeeds
   (overriding the host's `min-release-age` for the just-published artifact)
   and `import('<name>')` loads; packages with a bin also run `--help` and
   must show no module-resolution failure.

The ship records the outcome — the published `name@version` set, or "nothing to
publish" — into the story/PR, so **every ship carries explicit evidence of the
npm state** rather than a silent skip. Manual spot-check:
https://www.npmjs.com/package/plgg (and siblings) show the new version.

## Notes

- Auth is the ambient `~/.npmrc` of the executing host (`npm login`), never
  committed, never placed in this file.
- npm output must be redirected to a file on this host (a 2026-07-03 quirk:
  npm hangs writing to some capture pipes) — run the script in the
  background with output to a log, e.g. `./scripts/publish-npm.sh > /tmp/publish.log 2>&1`.
- `example`, `@plggmatic/example`, and `@plggmatic/site` are `private: true` and
  are skipped by flag, not by name-list.
- The `/ship` pause/ask mechanism itself lives upstream in the `workaholic` ship
  skill, which executes this `## Procedure` literally — the developer-driven,
  ask-and-await semantics are encoded here in the contract prose, not in a
  frontmatter field (`confirmation_method` stays `api-probe`: the post-publish
  `npm view` + install check is the registry probe).
