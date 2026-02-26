---
title: Delivery Policy
description: CI/CD pipeline, build process, deployment strategy, and release process for the plgg monorepo
category: developer
modified_at: 2026-02-26T03:27:33+00:00
commit_hash: ddbb696
---

[English](delivery.md) | [Japanese](delivery_ja.md)

# Delivery Policy

This document describes all implemented delivery practices in the plgg monorepo. Every
statement is grounded in an observable artifact (workflow file, shell script, or package
configuration). Areas where no evidence is found are marked "not observed."

## CI/CD Pipeline

The project uses GitHub Actions as its CI/CD platform. Four workflows are defined under
`.github/workflows/`.

**run-tests** (`.github/workflows/run-tests.yml`) is the primary quality gate. It triggers
on three pull request events — `review_requested`, `synchronize`, and `labeled` — and also
on direct pushes to the `main` branch. The workflow runs on `ubuntu-latest` with Node.js
22.x. It executes five sequential steps: dependency installation via `npm ci`, TypeScript
compilation check via `npx tsc --noEmit`, test suite via `npm test`, library build via
`npm run build`, and test coverage via `npm run coverage`. The workflow manages a
`ci-testing` label: when a review is requested, the label is automatically added to the
pull request. Subsequent pushes run the suite only when that label is present, preventing
redundant runs on drafts.

**start-pull-request** (`.github/workflows/start-pull-request.yml`) triggers when an issue
is assigned. It creates a feature branch and a draft pull request automatically. The branch
name is derived from the issue number and the current timestamp in JST
(`i{ISSUE_NUM}-{YYYYMMDD}-{HHMM}`). Issues labeled `idea` or `epic` are excluded from this
automation. The workflow validates that no open pull request already links to the same issue
before proceeding.

**prepare-release** (`.github/workflows/prepare-release.yml`) triggers on every push to
`main`. It uses the `git-pr-release` Ruby gem to aggregate merged pull requests from `main`
and open or update a single release candidate pull request targeting the `release` branch.
The pull request body is rendered from `.github/RELEASE_PR_TEMPLATE` using ERB templating
with a checklist of merged pull request titles. Merged pull requests are labeled
`release-candidate`. The timezone for the release PR title is `Asia/Tokyo`.

**release** (`.github/workflows/release.yml`) triggers when a pull request is merged into
the `release` branch. It runs two jobs sequentially: `deployment` and `publish-release-note`.
The `deployment` job contains a placeholder echo statement — no actual deployment target is
implemented. The `publish-release-note` job generates a CalVer version string in the format
`{YEAR}.{MM}.week{WEEK}.release{N}` (where `N` is a sequential release counter for the week),
then calls `release-drafter` to publish a GitHub Release with that tag and a release note
categorized by pull request labels (`addition`, `modification`, `refactoring`, `fix`).

## Build Process

Each of the three publishable packages (`plgg`, `plgg-kit`, `plgg-foundry`) uses an
identical build stack: Vite with `vite-plugin-dts`. The `build` npm script in each
`package.json` runs `vite build`, producing dual CJS and ESM outputs (`dist/index.cjs.js`
and `dist/index.es.js`) along with TypeScript declaration files (`dist/index.d.ts`).

The `sh/build.sh` script runs `npm run build` for `src/plgg` and `src/plgg-kit` in
sequence. It does not build `src/plgg-foundry` or `src/example`.

TypeScript compilation is enforced with a strict configuration in each package's
`tsconfig.json`. The `plgg` package enforces `strict`, `noUnusedLocals`,
`noUnusedParameters`, `noUncheckedIndexedAccess`, `noImplicitReturns`,
`noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`, and `isolatedModules`. The
project's root CLAUDE.md explicitly prohibits `as`, `any`, and `ts-ignore` as solutions to
type errors.

The CI pipeline (`run-tests` workflow) mirrors local build verification: it runs
`npx tsc --noEmit` before executing tests and then runs `npm run build` to confirm the
production artifact compiles cleanly.

The `sh/check-all.sh` script provides a local full-suite check: it chains
`test-plgg.sh`, `test-plgg-kit.sh`, `test-plgg-foundry.sh`, `tsc-example.sh`, and
`build.sh` in sequence.

Dependencies are installed across all four packages by `sh/npm-install.sh`, which runs
`npm install` in `src/plgg`, `src/plgg-kit`, `src/plgg-foundry`, and `src/example` in
order.

## Deployment Strategy

The `deployment` job in the `release` workflow contains only `echo "Deployment pipeline here"`. No actual deployment target, artifact upload, container registry push, npm publish
step, or environment promotion logic is wired into the release workflow.

The `publish` npm script (`vite build && npm publish`) exists in all three package
`package.json` files, and a dedicated `sh/publish-plgg.sh` shell script runs
`npm run publish` in `src/plgg`. However, neither of these is called from any GitHub
Actions workflow. npm publishing is not automated.

Deployment to environments other than npm (e.g., staging or production servers) is not
observed.

## Release Process

Releases follow a three-branch promotion model: feature branch -> `main` -> `release`.

1. A GitHub issue is filed using one of the five structured issue templates
   (Addition, Modification, Refactoring, Fix, Epic) under `.github/ISSUE_TEMPLATE/`.
2. Assigning the issue triggers `start-pull-request`, which creates a feature branch and
   an open pull request with a standardized body template requiring target, specification,
   self-review checklist, and evidence sections.
3. When the pull request is ready for testing, a reviewer is requested. This triggers the
   `run-tests` CI pipeline (via the `review_requested` event and the `ci-testing` label).
4. After merging to `main`, `prepare-release` automatically opens or updates a release
   candidate pull request targeting the `release` branch. The template
   `.github/RELEASE_PR_TEMPLATE` renders a timestamped title and checklist.
5. Merging the release candidate pull request into `release` triggers the `release`
   workflow, which runs the deployment placeholder and then publishes a GitHub Release with
   a CalVer version tag and a release note generated by `release-drafter`.

Version strings follow CalVer: `{YEAR}.{MM}.week{WEEK}.release{N}`. The release drafter
categorizes pull requests by labels into sections: Addition, Modification, Refactoring,
and Fix (`release-drafter-config.yml`).

Manual npm publishing exists (`sh/publish-plgg.sh`, `npm run publish`) but is not
integrated into the automated release workflow.

## Observations

The project has a fully automated issue-to-PR workflow (via `start-pull-request`), an
automated release candidate aggregation workflow (via `prepare-release` and `git-pr-release`),
and a GitHub Release publication step (via `release-drafter`). The CI test gate is
conditional on the `ci-testing` label, which provides control over when the suite runs
during review cycles. The three-branch promotion model (`feature -> main -> release`) is
consistently enforced through workflow triggers. TypeScript compilation is verified both
locally (via `sh/tsc-plgg.sh` and `sh/check-all.sh`) and in CI (via the `run-tests`
workflow).

One significant gap exists: the actual deployment step in the `release` workflow is
unimplemented (placeholder only). npm package publishing, while scripted locally, is not
connected to the automated release pipeline.

## Gaps

- **Deployment target**: The `deployment` job in `.github/workflows/release.yml` contains
  only `echo "Deployment pipeline here"`. No actual publish or deploy step is implemented in
  the automated pipeline. Not observed.
- **Automated npm publish**: The `npm run publish` script and `sh/publish-plgg.sh` exist
  but are not called from any workflow. Automated npm publishing is not observed.
- **Environment promotion**: Staging or production environment concepts, environment
  variables per deployment target, and environment-specific configuration are not observed.
- **Artifact storage**: No artifact upload steps (e.g., GitHub Actions artifacts, S3,
  container registry) are observed in any workflow.
- **Rollback procedure**: No rollback mechanism or procedure is observed.
- **Branch protection rules**: Branch protection configuration for `main` or `release` is
  not observable from repository files (requires GitHub settings UI; not observed in
  codebase artifacts).
- **Changelog automation**: CHANGELOG files exist per package but are updated manually;
  no automated changelog generation step is wired into the release workflow.
