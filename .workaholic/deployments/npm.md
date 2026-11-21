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
   must show no module-resolution failure. For `plgg-bundle`, the same installed
   consumer also builds a `target: "app"` twice, changing the source and executing
   fresh output each time; a second-start failure fails publication verification.

The ship records the outcome — the published `name@version` set, or "nothing to
publish" — into the story/PR, so **every ship carries explicit evidence of the
npm state** rather than a silent skip. Manual spot-check:
https://www.npmjs.com/package/plgg (and siblings) show the new version.

## Partway failure: resume, rollback, and issue close order

This is the **one** contract for what happens when step 3's run dies before
every package in the set is published — the question several earlier,
unmerged docs-only PRs each answered separately. This section is the
authoritative answer; a future change to this behavior amends this section,
it does not add a second one elsewhere.

**Resume.** `scripts/publish.ts`'s `runPublishSet` stages and checks every
package in the set (`stageChecked`: allowlist + entry-point presence) before
publishing **any** of them, so a defect caught at that step means nothing new
reached the registry — fix it and re-run the full command, no `ONLY=` needed.
A failure *after* that point means at least one `npm publish` already ran;
work out exactly where from the compact per-package status lines already
printed (`staged` / `published` / `resolved` / `<smoke>`, one per phase):

- A package whose line stops at `published`, `resolved`, or the smoke step
  **is already on the registry** — `npm publish` is irreversible and the
  script never re-sends a version it already sent. Do not include it when
  you resume.
- Every package whose lines are *all* missing (the run never reached it)
  still needs publishing.
- Resume with `ONLY=` set to exactly that still-needing-publish tail, in the
  same build order the first run used (`scripts/publish-npm.sh` prints this
  order; it is `build.sh`'s topology with `plgg-bundle` prepended). Packages
  the first run already finished are never re-published and never deleted —
  `ONLY=` simply excludes them.

**Rollback.** There is no rollback that removes a published version — see
this file's opening paragraph; `npm unpublish` is never the answer. If a
version that resolved and smoked clean turns out broken after the fact, roll
forward: `npm deprecate <name>@<version> '<reason>'` to warn installers off
it, then ship a fixed patch version through the normal preflight → gate →
publish → Confirmation path above. The deprecated version itself is left in
place, permanently.

**Issue close order.** A corpd-filed (or any externally-reported) issue is
closed by the PR whose merge is covered by a *passed* Confirmation for the
package version that actually carries the fix — never by the PR that merely
lands the source change on `main` without bumping the package's version.
Landing the fix unbumped (common when a fix is folded into a larger PR) does
not close the issue; write `Fixes #<n>` only in the PR that bumps the
version and only after this file's Confirmation has passed for that run, so
the GitHub auto-close lands in the same commit as live evidence the fix is
on the registry. When a single package version resolves more than one open
issue, close all of them off that one Confirmation together, in ascending
issue-number order, rather than letting separate PRs each claim one.

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
