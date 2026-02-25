---
title: Quality Context
description: Quality dimensions, assurance processes, metrics, gaps, and feedback loops for the plgg project
category: developer
modified_at: 2026-02-26T04:19:52+09:00
commit_hash: ddbb696
---

# Quality Context

This document captures the quality framework observable from project configuration and tooling across the plgg monorepo (packages: `plgg`, `plgg-kit`, `plgg-foundry`).

## Quality Dimensions

### Type Safety

**Standard**: No use of `as`, `any`, or `ts-ignore` as a solution to type errors (enforced: `CLAUDE.md`). TypeScript strict mode is active across all packages with the following flags enabled:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `allowUnusedLabels: false`
- `allowUnreachableCode: false`
- `exactOptionalPropertyTypes: true`
- `allowJs: false`
- `isolatedModules: true`
- `erasableSyntaxOnly: true`

**Evidence**: `src/plgg/tsconfig.json`, `src/plgg-foundry/tsconfig.json`, `src/plgg-kit/tsconfig.json`, `CLAUDE.md`

**Enforcement**: Automated — `tsc --noEmit` runs in CI (`run-tests.yml` step "Run TypeScript compilation check") and is the first step in `npm run test` in all three packages.

### Code Formatting

**Standard**: Prettier enforced with uniform configuration across all packages:

- `printWidth: 50`
- `semi: true`
- `singleQuote: false`
- `trailingComma: "all"`
- `bracketSameLine: false`

**Evidence**: `src/plgg/.prettierrc.json`, `src/plgg-foundry/.prettierrc.json`, `src/plgg-kit/.prettierrc.json`

**Enforcement**: Standard without enforcement. Prettier is configured but no automated formatter check runs in CI or via pre-commit hooks. Formatting compliance is manual.

### Test Correctness

**Standard**: All tests must pass before merge. The `npm run test` script runs `tsc --noEmit && vitest --run` in the `plgg` package.

**Evidence**: `src/plgg/package.json` scripts, `src/plgg-foundry/package.json` scripts, `src/plgg-kit/package.json` scripts

**Enforcement**: Automated — CI workflow `run-tests.yml` executes `npm test` in `src/plgg`.

**Observed metric**: 338 tests passing across 61 spec files in `plgg` (observed 2026-02-26).

**Gap**: `plgg-kit` and `plgg-foundry` tests are not executed in CI. Only `src/plgg` tests run in the `run-tests.yml` workflow.

### Test Coverage

**Standard (plgg)**: 90% thresholds for statements, branches, functions, and lines enforced via vitest v8 provider.

**Evidence**: `src/plgg/vite.config.ts` — `thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 }`

**Enforcement**: Automated — CI `run-tests.yml` step "Run tests with coverage" runs `npm run coverage`.

**Observed metric**: Coverage as of 2026-02-26 — statements: 89.81% (FAILING), branches: 92.24% (passing), functions: 90.2% (passing), lines: 89.81% (FAILING). The `Abstracts/Principals` and `Abstracts/Servables` interface-only files report 0% coverage and drag overall statements and lines below threshold.

**Standard (plgg-foundry, plgg-kit)**: No thresholds configured. `coverage: { all: true }` is set but thresholds are absent.

**Evidence**: `src/plgg-foundry/vite.config.ts`, `src/plgg-kit/vite.config.ts`

**Enforcement**: Standard without enforcement for `plgg-foundry` and `plgg-kit`. Coverage can be run manually but no CI step or threshold gates these packages.

### Build Integrity

**Standard**: The library must build successfully with `vite build` before release.

**Evidence**: `src/plgg/package.json` build script, `run-tests.yml` step "Build library"

**Enforcement**: Automated — CI runs `npm run build` in `src/plgg` on every qualifying PR and push to main.

### Code Linting

**Standard**: Not observed. No ESLint, Biome, or other linter configuration exists in any package root.

**Enforcement**: Not observed. No linting runs in CI or pre-commit hooks.

### Accessibility

**Standard**: Not observed. No accessibility testing tooling is configured.

**Enforcement**: Not observed.

### Security

**Standard**: Partially observed. `.env` and `.env.*` files are gitignored. Claude Code is configured to deny `Bash(git -C:*)` to prevent out-of-project git operations.

**Evidence**: `.gitignore`, `.claude/settings.json`

**Enforcement**: Partial — `.env` exclusion is enforced at git level. No dependency vulnerability scanning (e.g., `npm audit`) runs in CI.

### Documentation Quality

**Standard**: Not formally observed. PR template requires a "Specification / Test Plan" section and a self-review checklist. Issue templates enforce structured requirements for each issue type.

**Evidence**: `.github/workflows/start-pull-request.yml` PR body template, `.github/ISSUE_TEMPLATE/TMPL_01_ADDITION.yml`

**Enforcement**: Manual checklist in PR template. No automated documentation linting or completeness check.

---

## Assurance Processes

### CI: Run Tests (`run-tests.yml`)

**Trigger**: Pull request events `review_requested`, `synchronize` (when `ci-testing` label is present), `labeled` with `ci-testing`; push to `main`.

**Scope**: `src/plgg` package only.

**Enforcement mechanism**: Sequential GitHub Actions steps — TypeScript compilation check, test run, build, coverage with thresholds.

**Note**: The `ci-testing` label is automatically applied when a review is requested. This means CI does not run on every PR push — only when the `ci-testing` label is present or review is requested.

**Evidence**: `.github/workflows/run-tests.yml`

### CI: Prepare Release (`prepare-release.yml`)

**Trigger**: Push to `main`.

**Scope**: Repository-level — aggregates merged PRs into a release candidate PR from `main` to `release` branch using `git-pr-release`.

**Enforcement mechanism**: Automated PR creation with release candidate checklist.

**Evidence**: `.github/workflows/prepare-release.yml`

### CI: Release (`release.yml`)

**Trigger**: PR closed (merged) to `release` branch.

**Scope**: Deployment pipeline stub and CalVer release note generation via release-drafter.

**Evidence**: `.github/workflows/release.yml`

### CI: Start Pull Request (`start-pull-request.yml`)

**Trigger**: GitHub Issue assigned.

**Scope**: Repository-level — creates a branch and draft PR automatically, blocking if an open linked PR already exists.

**Evidence**: `.github/workflows/start-pull-request.yml`

### Manual: Self-Review Checklist

**Trigger**: Pre-review-request by PR author.

**Scope**: Every PR.

**Enforcement mechanism**: PR template checklist requiring self-review confirmation and evidence attachment (demo video or image). Compliance is manual.

**Evidence**: `.github/workflows/start-pull-request.yml` PR body template

### Pre-commit Hooks

**Status**: Not configured. No `.husky/` directory exists. No `lint-staged` configuration observed.

---

## Quality Metrics

| Metric | Value | Source | Verifiable |
|---|---|---|---|
| Test count (plgg) | 338 tests, 61 files | Local run 2026-02-26 | Yes |
| Statements coverage (plgg) | 89.81% | Local run 2026-02-26 | Yes |
| Branch coverage (plgg) | 92.24% | Local run 2026-02-26 | Yes |
| Function coverage (plgg) | 90.2% | Local run 2026-02-26 | Yes |
| Line coverage (plgg) | 89.81% | Local run 2026-02-26 | Yes |
| Coverage threshold (plgg) | 90% all dimensions | `src/plgg/vite.config.ts` | Yes |
| Coverage threshold (plgg-foundry) | None set | `src/plgg-foundry/vite.config.ts` | Yes |
| Coverage threshold (plgg-kit) | None set | `src/plgg-kit/vite.config.ts` | Yes |
| CI test scope | plgg only | `run-tests.yml` | Yes |
| Pre-commit hooks | None | Filesystem | Yes |
| Lint tooling | None | Filesystem | Yes |

---

## Quality Gaps

### Gap 1: Coverage Thresholds Below Passing in plgg

**Expected standard**: 90% statements, branches, functions, lines (`src/plgg/vite.config.ts`)

**Missing enforcement**: Statements and lines are at 89.81%, below the 90% threshold. The abstract interface files under `Abstracts/Principals` and `Abstracts/Servables` contribute 0% coverage and are not excluded from the coverage scope.

**Affects**: quality-lead, test-lead

### Gap 2: No Coverage Thresholds for plgg-foundry and plgg-kit

**Expected standard**: Coverage thresholds consistent with plgg's 90% standard.

**Missing enforcement**: `src/plgg-foundry/vite.config.ts` and `src/plgg-kit/vite.config.ts` configure `coverage: { all: true }` but omit `thresholds`. No CI step runs coverage for these packages.

**Affects**: quality-lead, test-lead

### Gap 3: plgg-kit and plgg-foundry Tests Not in CI

**Expected standard**: All package tests should run in CI.

**Missing enforcement**: `run-tests.yml` only installs dependencies and runs tests in `src/plgg`. `plgg-kit` and `plgg-foundry` test suites are not executed.

**Affects**: quality-lead, test-lead

### Gap 4: No Code Linting

**Expected standard**: Not formally stated, but type safety is highly constrained. Static analysis beyond TypeScript type-checking is absent.

**Missing enforcement**: No ESLint, Biome, or equivalent linter is configured at any package level. No linter runs in CI.

**Affects**: quality-lead

### Gap 5: Prettier Not Enforced Automatically

**Expected standard**: Prettier configuration exists and is consistent across all packages.

**Missing enforcement**: No `prettier --check` step in CI. No pre-commit hook runs `prettier`. Formatting compliance is entirely manual.

**Affects**: quality-lead

### Gap 6: No Dependency Vulnerability Scanning

**Expected standard**: Not formally documented, but security is a recognized dimension.

**Missing enforcement**: No `npm audit` or equivalent runs in CI. Dependency vulnerabilities are not systematically detected.

**Affects**: quality-lead

### Gap 7: CI Trigger Requires Manual Label

**Expected standard**: Tests should run on all PR pushes to provide early signal.

**Observed behavior**: `run-tests.yml` only runs on `synchronize` events if the `ci-testing` label is already present. Tests do not run automatically on every PR push.

**Affects**: quality-lead, test-lead

---

## Feedback Loops

### Failing Coverage Blocks CI

**Connection**: When `npm run coverage` exits non-zero in `run-tests.yml`, the workflow fails. This prevents the PR from being considered ready for merge if branch protection requires CI to pass.

**Evidence**: `run-tests.yml` step "Run tests with coverage"; `src/plgg/vite.config.ts` thresholds

**Limitation**: Coverage thresholds are currently not passing (89.81% < 90% for statements/lines). If branch protection does not enforce CI status, this feedback loop is advisory only.

### Failing TSC Compilation Blocks Test Run

**Connection**: `npm run test` in plgg runs `tsc --noEmit` before vitest. A compilation failure stops the test run immediately, providing fast feedback on type errors.

**Evidence**: `src/plgg/package.json` test script

### Review Request Triggers CI

**Connection**: Requesting a reviewer on a PR adds the `ci-testing` label and triggers the test workflow. This ensures CI runs before code review is performed.

**Evidence**: `run-tests.yml` trigger on `review_requested` + label-add logic

### PR Template Self-Review

**Connection**: The PR body template includes a mandatory checklist. Authors must confirm self-review and attach evidence before requesting review.

**Evidence**: PR body in `start-pull-request.yml`

**Limitation**: This is a documentation standard, not an automated check. There is no enforcement preventing a PR from being submitted without completing the checklist.
