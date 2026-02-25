---
title: Quality Policy
description: Linting, formatting, code review, quality metrics, and type safety practices for the plgg monorepo
category: developer
modified_at: 2026-02-26T00:00:00+09:00
commit_hash: ddbb696
---

[English](quality.md) | [Japanese](quality_ja.md)

# Quality Policy

This document describes all implemented quality practices in the plgg monorepo
(packages: `plgg`, `plgg-kit`, `plgg-foundry`). Every statement reflects only
implemented and executable practices found in the repository. Areas with no
codebase evidence are marked "not observed."

## Linting and Formatting

No JavaScript or TypeScript linter (ESLint, Biome, or equivalent) is configured
in any package. The role of static analysis is entirely fulfilled by the
TypeScript compiler operating under strict mode. No linter configuration file
exists under `src/plgg/`, `src/plgg-kit/`, or `src/plgg-foundry/`.

Prettier is configured identically across all three packages via
`.prettierrc.json` files in each package root. The shared configuration
enforces: `printWidth: 50`, `semi: true`, `singleQuote: false`,
`trailingComma: "all"`, `bracketSameLine: false` (source:
`src/plgg/.prettierrc.json`, `src/plgg-kit/.prettierrc.json`,
`src/plgg-foundry/.prettierrc.json`). No automated formatter check runs in CI
or via a pre-commit hook. Formatting compliance is enforced by convention only.

## Code Review

Pull requests are created automatically via the `start-pull-request` workflow
(`.github/workflows/start-pull-request.yml`) when a GitHub issue is assigned.
The workflow generates a PR body template containing four required sections:
Target (linked issue), Specification / Test Plan, Additional Instructions, and
a pre-review checklist. The checklist requires the author to confirm self-review
(no sensitive information, typos, unrelated changes, or debugging code) and to
attach evidence (demo video or image) before requesting a review.

Requesting a reviewer triggers two actions: the `ci-testing` label is
automatically added to the PR (`.github/workflows/run-tests.yml`), and the CI
test suite fires. This coupling ensures tests run before any human review
begins. Subsequent pushes to the PR branch re-run CI only when the `ci-testing`
label is present, preventing redundant runs on drafts or work-in-progress
pushes.

The PR body template and self-review checklist are enforced only as
documentation standards. No automated mechanism prevents a PR from being
submitted with an incomplete checklist.

## Quality Metrics

The `plgg` package enforces coverage thresholds at 90% for all four dimensions:
statements, branches, functions, and lines. These thresholds are configured in
`src/plgg/vite.config.ts` under the vitest `test.coverage.thresholds` block
and use the v8 provider. Coverage output formats are `text`, `lcov`, and
`html`. The threshold check runs in CI as part of the `run-tests` workflow step
"Run tests with coverage" (`npm run coverage` in `src/plgg`).

The `plgg-foundry` and `plgg-kit` packages configure `coverage: { all: true }`
in their `vite.config.ts` files but define no `thresholds` block. No CI step
runs coverage for either of these packages. Their coverage output is not gated.

No cyclomatic complexity limits, duplication detection, or bundle size budgets
are configured in any package.

## Type Safety

TypeScript strict mode is active across all three packages with an identical
`compilerOptions` set defined in each package's `tsconfig.json`. The flags in
force are: `strict`, `noUnusedLocals`, `noUnusedParameters`,
`noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`,
`allowUnusedLabels: false`, `allowUnreachableCode: false`,
`exactOptionalPropertyTypes`, `skipLibCheck`, `isolatedModules`, `allowJs:
false`, and `erasableSyntaxOnly` (source: `src/plgg/tsconfig.json`,
`src/plgg-foundry/tsconfig.json`, `src/plgg-kit/tsconfig.json`).

The root `CLAUDE.md` declares as the highest-priority rule that `as`, `any`,
and `@ts-ignore` are strictly prohibited as solutions to type errors under any
circumstances. This prohibition is an explicit project-level constraint recorded
in `.workaholic/constraints/quality.md`.

Type checking is enforced in two places. First, `npm run test` in all three
packages runs `tsc --noEmit` before invoking vitest (source: `scripts.test` in
each `package.json`). A compilation failure stops the test run immediately.
Second, the CI `run-tests` workflow (`.github/workflows/run-tests.yml`)
executes a dedicated step "Run TypeScript compilation check" (`npx tsc
--noEmit`) in `src/plgg` before the test step. The local shell scripts
`sh/tsc-plgg.sh` and `sh/tsc-plgg-foundry.sh` and `sh/tsc-plgg-kit.sh`
provide package-specific compilation gates for local use.

## Observations

The quality stack relies primarily on TypeScript's strict compiler as the
correctness layer. The monorepo applies an identical, maximally strict
`tsconfig.json` to all three packages, and the project's highest-stated rule is
the prohibition on type escape hatches. Coverage thresholds are enforced by CI
for the core `plgg` package. The CI pipeline integrates type checking, testing,
coverage, and build verification as sequential steps for `plgg`. The PR
workflow couples review request to CI trigger, ensuring tests run before human
review. Prettier is uniformly configured across all packages, providing
formatting consistency when authors apply it manually.

The quality manager constraint document (`.workaholic/constraints/quality.md`)
explicitly documents which areas are constrained and which are intentionally
unconstrained. Coverage threshold gaps for `plgg-foundry` and `plgg-kit`, the
absence of CI tests for those packages, and the absence of automated Prettier
enforcement are recorded as open constraints with defined compliance criteria.

## Gaps

**No linting**: No ESLint, Biome, or equivalent linter is configured in any
package. TypeScript strict mode is the sole static analysis mechanism. Not
observed.

**Prettier not automatically enforced**: Three `.prettierrc.json` files exist
with identical configuration, but no `prettier --check` step runs in CI and no
pre-commit hook applies Prettier to staged files. Formatting compliance is
manual. Not observed as an automated enforcement.

**Coverage thresholds absent in plgg-foundry and plgg-kit**: Both packages
configure `coverage: { all: true }` but define no `thresholds` block in their
`vite.config.ts` files. No automated coverage gate exists for either package.
Not observed.

**CI test scope limited to plgg**: The `run-tests.yml` workflow installs
dependencies and runs tests only in `src/plgg`. Tests for `src/plgg-kit` and
`src/plgg-foundry` do not run in CI. Not observed for those packages.

**No dependency vulnerability scanning**: No `npm audit` or equivalent runs in
any CI workflow. Dependency vulnerabilities are not detected automatically. Not
observed.

**No complexity or duplication thresholds**: No cyclomatic complexity limit,
code duplication threshold, or similar metric is configured in any package. Not
observed.

**No pre-commit hooks**: No `.husky/` directory or `lint-staged` configuration
exists. All pre-merge checks run in CI or are manual. Not observed.
