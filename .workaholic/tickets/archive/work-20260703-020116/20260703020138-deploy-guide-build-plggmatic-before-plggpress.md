---
created_at: 2026-07-03T02:01:38+09:00
author: a@qmu.jp
type: bugfix
layer: [Config]
effort: 0.25h
commit_hash: ea2afcc
category: Changed
depends_on:
---

# Deploy Guide CI: build `plggmatic` before `plggpress` (post-merge deploy failure)

## Overview

The `Deploy Guide` workflow run for merge commit `efd21c0` (PR #51) **failed**: `.github/workflows/deploy-guide.yml` builds package dists from a hard-coded dependency-ordered list that does not include `plggmatic`, and plggpress (rewired onto the plggmatic facade in `fa9ab95`) now needs `plggmatic/dist` to exist before its own bundle step — `plgg-bundle: EvalError: failed to read export surface: Cannot find module '.../plggpress/node_modules/plggmatic/dist/index.es.js'`. Locally `check-all.sh` builds every package so the gap was invisible (the exact clean-runner masking pattern already recorded for plgg-bundle and plgg-highlight). The production site is stale-but-serving (deploy-pages only swaps on success); this fix re-lands the docs deploy.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — repository-wide CI lives under `.github/workflows/`; the fix stays in the one canonical workflow
- `workaholic:implementation` / `policies/coding-standards.md` — applies to all code work (shell here is a one-list edit)
- `workaholic:operation` / CI/CD automation — the deploy pipeline must reproduce the dependency graph the packages actually declare; a hard-coded list must follow package.json reality

## Key Files

- `.github/workflows/deploy-guide.yml` - the `for pkg in ...` dist build loop (lines ~69-71): `plggmatic` must be inserted after its deps (plgg, plgg-http, plgg-view, plgg-server, plgg-cli) and before `plggpress`; note `plgg-cli` is also absent — plggmatic depends on it, so it must be added too
- `.workaholic/deployments/guide.md` - record the failed run 28607344216 and the re-run confirmation in `## Confirmations`
- `packages/plggmatic/package.json` - the dependency set that dictates the insert position (plgg, plgg-http, plgg-server, plgg-view, plgg-md, plgg-highlight, plgg-cli)

## Related History

- [20260703000542-plggpress-consume-thick-plggmatic.md](.workaholic/tickets/archive/work-20260701-185044/20260703000542-plggpress-consume-thick-plggmatic.md) - the rewire that made plggmatic a build-order prerequisite of plggpress
- The deferred concern "plggmatic framework not in scripts/build.sh until consumer lands" (PR #51 story §6) anticipated exactly this class of gap; scripts/build.sh got plggmatic but deploy-guide.yml's own list did not
- Clean-runner masking precedent: plgg-bundle and plgg-highlight both needed explicit node_modules installs in this workflow for the same "works locally, missing in CI" reason

## Implementation Steps

1. In `.github/workflows/deploy-guide.yml`, extend the build loop list so every plggpress prerequisite is built first: insert `plgg-cli` (after plgg) and `plggmatic` (after plgg-server/plgg-view/plgg-md/plgg-highlight, before `plggpress`). Resulting order: `plgg plgg-test plgg-http plgg-router plgg-view plgg-kit plgg-server plgg-fetch plgg-sql plgg-foundry plgg-md plgg-highlight plgg-cli plggmatic plggpress`.
2. Verify locally that the listed order satisfies every package.json dependency edge among the listed packages (mechanical check of each listed package's plgg-family deps appearing earlier in the list).
3. Append the failed-run record (run 28607344216, cause, fix commit) to `.workaholic/deployments/guide.md` `## Confirmations`.
4. Ship: merging this workflow-file change itself triggers `Deploy Guide` (the workflow file is in its own trigger paths); watch the run and probe the site — this doubles as the still-pending production confirmation for the PR #51 content.

## Quality Gate

**Acceptance criteria:**

- Every package in the deploy-guide.yml build list has all its plgg-family `dependencies` earlier in the list (mechanically checked)
- `plggmatic` and `plgg-cli` appear in the list; `plggpress` remains last before the guide build
- Post-merge: the `Deploy Guide` run for the fix's merge commit concludes `success`, and `https://qmu.github.io/plgg/` serves HTTP 200 with the new content

**Verification method:**

- A one-shot script/loop over the list validating dependency order against each package.json
- `gh run watch` on the triggered run; `curl -sI` probe of the site

**Gate:** dependency-order check passes pre-merge; the post-merge workflow run is green and the site probe passes (recorded in `.workaholic/deployments/guide.md`).

## Considerations

- The hard-coded list is a standing fragility: any future consumer/dep change can silently break CI again while check-all stays green. A follow-up could derive the order from package.json topology (one canonical runner per the command-scripts policy) — out of scope here, note as deferred concern
- Do NOT add plggmatic node_modules install steps unless the build fails without them — plggmatic's build imports only from its own src and plgg-bundle (which already gets its install step); its `npm install` happens inside the loop like every other package

## Final Report

Development completed as planned. `plgg-cli` and `plggmatic` inserted into deploy-guide.yml's dist build list before `plggpress`; the failed run 28607344216 and its root cause recorded in `.workaholic/deployments/guide.md`. Pre-merge gate verified: mechanical check confirms every listed package's plgg-family dependencies build earlier in the list. Post-merge gate (green Deploy Guide run + site probe) executes when this ships and doubles as PR #51's pending production confirmation.

### Discovered Insights

- **Insight**: deploy-guide.yml's hard-coded build list is a second, independent copy of the dependency topology (besides scripts/build.sh and check-all.sh) — any package.json dep change can break it while every local gate stays green, and only the post-merge clean runner reveals it.
  **Context**: Third instance of the clean-runner masking class (after plgg-bundle and plgg-highlight node_modules). A follow-up deriving the CI build order from package.json topology via one canonical runner would eliminate the class; recorded as a Concern for the branch story.
