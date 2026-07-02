---
created_at: 2026-07-03T05:03:55+09:00
author: a@qmu.jp
type: refactoring
layer: [Config, Infrastructure]
effort: 0.5h
commit_hash: 0c8239e
category: Changed
depends_on:
---

# Conform to the local CI/CD policy: only the minimum GitHub Actions remain

## Overview

Reduce `.github/workflows/` to the minimum the operation pillar's **Local CI/CD Execution** policy justifies: hosted GitHub Actions is a *backstop*, never the primary axis — inspections and releases are repository scripts run locally/in containers. Concretely, of the five current workflows only two roles survive: (a) a **fresh-clone merge gate** that calls the canonical local runner verbatim, and (b) the **Pages deploy**, which genuinely needs GitHub-platform OIDC. Everything else — the hosted CalVer release orchestration and the issue→PR convenience automation — is removed, and the surviving workflows shed every line of inline multi-step logic in favor of canonical script calls (`workaholic:implementation` / command-scripts: "have CI call the script, not reinvent it").

Scope decisions (recommended defaults recorded while the developer was away from the interrogation prompt — confirm or adjust at the `/drive` approval gate):

- **Remove the CalVer release pair** (`prepare-release.yml`, `release.yml`, plus `release-drafter-config.yml` and `.github/RELEASE_PR_TEMPLATE` if present): releases become script-driven from `/ship` per the ci-cd policy. This supersedes the recorded "CI-owned CalVer releases" decision — the developer's request ("only leave minimum github actions") is the newer instruction; the release-flow memory/contract must be updated as part of this ticket. Note `release.yml`'s "Deployment" step is an `echo` placeholder — the pair only ever published tags/notes.
- **Remove `start-pull-request.yml`**: issue-assigned→PR scaffolding is a GitHub convenience (neither gate nor OIDC deploy), and its `i<num>-date` branch naming contradicts the `work-YYYYMMDD-HHMMSS` policy actually in use.
- **`run-tests.yml` becomes the thin backstop gate**: checkout + setup-node + `./scripts/npm-install.sh` + `./scripts/check-all.sh`, running on every PR and push to main (drop the `ci-testing` label dance). Full-suite coverage replaces the current plgg-only subset; accept the longer runner time (~10–15 min).
- **`deploy-guide.yml` keeps only what OIDC requires**: its hand-maintained per-package build loop and ad-hoc install steps collapse into `./scripts/npm-install.sh` + `./scripts/build.sh` (the canonical dependency-ordered build), directly resolving the PR #52 deferred concern "Deploy Guide's hard-coded build list is a second copy of the dependency topology".

## Policies

The standard engineering policies that govern this ticket. The implementing session MUST read each linked policy hard copy before writing code.

- `workaholic:operation` / `policies/ci-cd.md` — the decisive lens: local-first CI/CD; hosted Actions only as a fresh-clone backstop gate + platform-bound deploys; releases consolidated into scripts run from /ship
- `workaholic:implementation` / `policies/command-scripts.md` — CI YAML with multi-step shell logic is not tolerated; workflows call the one canonical runner
- `workaholic:design` / `policies/vendor-neutrality.md` — bound the GitHub dependence surface; remove workflow conveniences that deepen lock-in without a gate/OIDC role
- `workaholic:implementation` / `policies/vendor-neutrality.md` — implementation counterpart: reuse the already-present scripts, no new dependencies
- `workaholic:implementation` / `policies/directory-structure.md` — repository-wide scripts stay in `scripts/`; workflows in `.github/workflows/`
- `workaholic:implementation` / `policies/coding-standards.md` — universal for code work (shell here)

## Key Files

- `.github/workflows/run-tests.yml` - shrink to the thin backstop: checkout, setup-node (npm cache), `./scripts/npm-install.sh`, `./scripts/check-all.sh`; triggers: `pull_request` + `push: main`; drop the label-gating conditions and the plgg-only inline steps
- `.github/workflows/deploy-guide.yml` - replace the plgg-bundle/plgg-highlight install steps and the 15-package inline loop with `./scripts/npm-install.sh` + `./scripts/build.sh`; keep the guide build step + `upload-pages-artifact` + `deploy-pages` (the OIDC part) unchanged
- `.github/workflows/prepare-release.yml`, `.github/workflows/release.yml` - delete; also delete `release-drafter-config.yml` (repo root or .github/) and `.github/RELEASE_PR_TEMPLATE`, and check for a leftover `release` branch on origin (document; do not force-delete without noting it)
- `.github/workflows/start-pull-request.yml` - delete
- `scripts/npm-install.sh` - verify it installs every package's node_modules on a clean runner (the clean-runner masking class: `file:` links install nothing); extend it if any package is missing rather than adding workflow-level `npm ci` steps
- `scripts/check-all.sh`, `scripts/build.sh` - the canonical runners the workflows call; must remain the single source of gate/build logic
- `.workaholic/deployments/guide.md` - deploy-guide.yml is named by the deployment contract; update its "How it deploys" build description
- `README.md` / docs - sweep references to removed workflows (release flow description if any)

## Related History

The canonical-runner discipline and clean-runner masking pattern are both well established; this ticket extends them to their policy end-state.

Past tickets that touched similar areas:

- [20260703020138-deploy-guide-build-plggmatic-before-plggpress.md](.workaholic/tickets/archive/work-20260703-020116/20260703020138-deploy-guide-build-plggmatic-before-plggpress.md) - the deploy failure caused by deploy-guide.yml's hand-maintained topology copy; its Considerations explicitly deferred "derive the order from package.json topology / one canonical runner" — this ticket delivers that by calling build.sh
- PR #52 deferred concern "Deploy Guide's hard-coded build list is a second copy of the dependency topology" (.workaholic/concerns/52-*) - resolved by this ticket
- The vite/happy-dom gate scripts (gate-vite.sh, gate-happy-dom.sh) already demonstrate the shared-gate rule: one script, referenced by both check-all.sh and CI — the pattern this ticket generalizes
- Release-flow memory ("CI-owned CalVer releases; /ship must not manually publish") - superseded by this ticket's script-driven release decision; update the memory and any contract text at ship time

## Implementation Steps

1. **Verify `scripts/npm-install.sh` covers a clean runner**: it must install node_modules for every package that builds or tests (plgg-bundle bootstrap included). Extend the script (not the workflows) for any gap.
2. **Rewrite `run-tests.yml`**: name it the backstop gate; triggers `pull_request` (all) + `push: main`; steps: checkout, setup-node 22 with npm cache, `./scripts/npm-install.sh`, `./scripts/check-all.sh`. Delete the label logic, the plgg-only build/test/coverage steps, and the direct gate calls (check-all runs them).
3. **Slim `deploy-guide.yml`**: keep triggers/permissions/concurrency; steps become checkout, setup-node, `./scripts/npm-install.sh`, `./scripts/build.sh`, the guide build, upload-pages-artifact, deploy-pages. Delete the two ad-hoc install steps and the inline loop (and its topology comment block).
4. **Delete** `prepare-release.yml`, `release.yml`, `start-pull-request.yml`, `release-drafter-config.yml`, `.github/RELEASE_PR_TEMPLATE`. Note the orphaned `release` branch and `release-candidate` label in the ticket's Final Report (cleanup is manual/optional).
5. **Update the deployment contract** (`.workaholic/deployments/guide.md`) build description, and sweep README/docs for references to the removed workflows.
6. **Record the release-flow change**: releases are now script-driven from `/ship` (`publish-release.sh` stops deferring — its `ci_publishes` scan will no longer find a publisher, so it creates the GitHub Release from the ship's release note; verify its tag derivation works without the CalVer workflow, or fix the tag scheme in that script).
7. **Verify locally**: `scripts/check-all.sh` green; `actionlint` if available (else YAML sanity via `python3 -c "import yaml,glob;[yaml.safe_load(open(f)) for f in glob.glob('.github/workflows/*.yml')]"`); mechanical check that no workflow contains a multi-step `run:` block with build/test logic (only script calls and the Pages actions).

## Quality Gate

Recommended defaults recorded while the developer was away — confirm at the `/drive` approval gate.

**Acceptance criteria:**

- `.github/workflows/` contains exactly `run-tests.yml` and `deploy-guide.yml`; neither contains inline multi-step build/test logic (every `run:` block is a single canonical script call, the guide build, or a Pages action)
- `scripts/npm-install.sh` + `scripts/check-all.sh` succeed from a state simulating a clean runner (at minimum: the scripts are the only entry points the workflows call)
- Local `scripts/check-all.sh` green at HEAD
- Post-merge: the slim run-tests gate passes on this ticket's own PR; the Deploy Guide run for the merge commit is green and the site probe (https://plgg.qmu.co.jp/ 200) passes — proving the build.sh collapse on the real clean runner
- The release-flow handover is documented (deployment contract + memory updated); on the NEXT ship, `publish-release.sh` publishes the GitHub Release from the note (exercised and recorded then)

**Verification method:** the workflow-content mechanical check (grep for multi-line `run:` blocks), YAML parse of all workflows, local check-all, and the post-merge run/probe observations recorded in the deployment contract.

**Gate:** all pre-merge items green before approval; the post-merge items are the ship's confirmation; the next-ship release exercise is a recorded follow-through, not a blocker for this ticket.

## Considerations

- **The release-pair removal supersedes a recorded decision** ("CI-owned CalVer releases") — this must be explicit in the PR story and the release-flow memory updated at ship, so future sessions don't re-defer to a CI publisher that no longer exists (`.github/workflows/release.yml`)
- `publish-release.sh`'s `ci_publishes` detection will flip from defer to publish once release.yml is gone — its tag derivation (CalVer vs semver vs note-derived) must be checked before the next ship relies on it (`plugins: workaholic ship/scripts/publish-release.sh` — read-only dependency; if its tag scheme needs repo-side convention, document it in the deployment contract)
- Full-suite check-all on every PR raises runner minutes materially (~10–15 min/run); if this becomes a problem, re-introduce scoping via paths filters — not via inline logic (`.github/workflows/run-tests.yml`)
- The `release` branch and `release-candidate` label become orphans on GitHub; leave them (harmless) but note them so nobody mistakes them for live machinery
- `run-tests.yml`'s current `permissions: issues/pull-requests: write` exist only for the label automation — drop to `contents: read` in the slim gate (least privilege)
- Branch protection/required checks (if any) may reference the old job name — verify after merge that the required-check name still matches (`gh api repos/qmu/plgg/branches/main/protection`, may 404 without perms)

## Final Report

Development completed as planned. Five workflows reduced to two: run-tests.yml is the thin backstop gate (npm-install.sh + check-all.sh on every PR and main push; label machinery and write permissions dropped), deploy-guide.yml keeps only the OIDC deploy with its build collapsed onto scripts/build.sh. The CalVer release pair, start-pull-request.yml, release-drafter config and RELEASE_PR_TEMPLATE are deleted; releases are script-driven from /ship per the new .workaholic/deployments/release.md contract (CalVer tag scheme preserved). scripts/npm-install.sh gained plgg-md, plgg-highlight, plggmatic, plggpress and guide. Verified: mechanical no-inline-logic check (zero multi-line run blocks, every step whitelisted), YAML parse, fresh check-all.sh exit 0, main unprotected (no required-check rename risk).

### Discovered Insights

- **Insight**: run-tests.yml had quietly become WEAKER than the local gate — it built and tested only plgg + plgg-test while check-all.sh covers all 18 packages — so the "backstop" was gating a subset while looking authoritative.
  **Context**: Inline CI logic doesn't just duplicate the canonical runner, it decays independently of it; the thin-caller form makes that divergence structurally impossible.
- **Insight**: release.yml's deployment job was a literal `echo "Deployment pipeline here"` placeholder — the hosted "CD" never deployed anything; only tags/notes were real.
  **Context**: The CI-owned-CalVer memory overstated what CI owned; moving releases to /ship's publish-release.sh loses nothing operational. The release-flow memory must be updated when this ships.
