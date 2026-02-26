---
title: Test Policy
description: Documents the implemented testing practices across the plgg, plgg-foundry, and plgg-kit packages, including frameworks, levels, coverage targets, and test organization.
category: developer
modified_at: 2026-02-26T03:27:33Z
commit_hash: ddbb696
---

[English](test.md)

# Test Policy

This document describes the testing practices that are implemented and executable in the plgg monorepo. The repository contains three packages -- `plgg` (core pipeline library), `plgg-foundry` (foundry system), and `plgg-kit` (vendor LLM adapters) -- each with its own test suite. All statements below describe implemented behavior with citations to the enforcement mechanism.

## Testing Framework

All three packages use [Vitest](https://vitest.dev/) as the test framework, configured through each package's `vite.config.ts` via the `/// <reference types="vitest" />` directive and a `test` block within the Vite `defineConfig` call. Vitest is invoked directly by each package's `npm run test` script (`src/plgg/package.json`, `src/plgg-foundry/package.json`, `src/plgg-kit/package.json`). The `test` npm script in every package prepends a TypeScript compilation check -- `tsc --noEmit && vitest --run` -- so both compilation and test execution are gated by the same command. Test files use the `.spec.ts` suffix and import `test`, `expect`, and `assert` from `vitest` directly.

## Testing Levels

The repository practices two identifiable testing levels.

**Unit tests** are the primary level and are the only tests that run in CI without skipping. They appear throughout the `plgg` package (`src/plgg/src/**/*.spec.ts`) with one spec file per source module, covering all type modules across Atomics, Basics, Collectives, Conjunctives, Contextuals, Disjunctives, Exceptionals, Flowables, Functionals, and Grammaticals categories (62 spec files total). The `plgg-foundry` package contains unit tests in `src/plgg-foundry/src/Foundry/model/Foundry.spec.ts` and `src/plgg-foundry/src/Foundry/usecase/blueprint.spec.ts` that test model construction and opcode extraction without requiring external services.

**Integration tests** against live LLM APIs (Anthropic, OpenAI, Google) and end-to-end foundry execution flows exist in both `plgg-foundry` and `plgg-kit`. These tests are uniformly decorated with `test.skip(...)` and are not executed in CI. They require environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`) loaded from a `.env` file via `dotenv` (configured in `src/plgg-foundry/vite.config.ts` and `src/plgg-kit/vite.config.ts`). The skipped tests carry explicit timeouts (20000 ms to 60000 ms) indicating they were designed for manual or conditional execution.

End-to-end no-skip integration tests at the system level (exercising full `runFoundry` pipelines with live LLMs in CI) are not observed.

## Coverage Targets

The `plgg` package enforces coverage thresholds at the 90% level for statements, branches, functions, and lines. These thresholds are declared in `src/plgg/vite.config.ts` under `test.coverage.thresholds` and are checked whenever `npm run coverage` runs. The CI workflow (`.github/workflows/run-tests.yml`) runs `npm run coverage` as the final step in its job, which means threshold failure causes the CI job to fail.

Coverage reporting uses the V8 provider (`@vitest/coverage-v8`) and produces text, lcov, and HTML reports. The `coverage.all: true` option collects coverage from all source files, not just those imported by tests. The `plgg-foundry` and `plgg-kit` packages configure `coverage.all: true` but do not declare thresholds, meaning their coverage is measured but not enforced.

The `sh/coverage-plgg.sh` script runs `npm run coverage` in `src/plgg` and exits non-zero if coverage thresholds are not met. The slash command `.claude/commands/add-test.md` instructs test authors to run `sh/coverage-plgg.sh` and maintain 90% coverage (described there as C1 and C2) when adding or improving tests.

## Test Organization

Tests co-locate with their source files using the `.spec.ts` suffix. In `plgg`, each source module has a paired spec file in the same directory (for example, `src/Atomics/Bool.ts` is tested by `src/Atomics/Bool.spec.ts`). In `plgg-foundry` and `plgg-kit`, spec files are placed alongside the source module they test.

Each package exposes three test-related npm scripts: `test` (one-shot compilation check plus test run), `test:watch` (Vitest interactive watch mode), and `coverage` (one-shot run with V8 coverage). Shell wrappers at the repository root invoke each package's npm script: `sh/test-plgg.sh`, `sh/test-plgg-foundry.sh`, `sh/test-plgg-kit.sh`, `sh/test-watch-plgg.sh`, `sh/test-watch-plgg-foundry.sh`, and `sh/test-watch-plgg-kit.sh`.

Test files use only the `test` function from Vitest; `describe` and `it` are not used. This convention is codified in the slash command `.claude/commands/add-test.md`. Assertions use `expect` and `assert` from Vitest. All imports within spec files are absolute (no relative imports), using the package alias configured in each `vite.config.ts` (e.g., `plgg`, `plgg-foundry`, `plgg-kit`).

The CI workflow (`.github/workflows/run-tests.yml`) installs dependencies, runs the TypeScript compilation check, runs `npm test`, builds the library, then runs `npm run coverage`, all scoped to `src/plgg`. The workflow is triggered on pushes to `main` and on pull requests when the `review_requested` event fires or the `ci-testing` label is present.

## Observations

The `plgg` package is thoroughly unit-tested with 62 spec files covering all source modules. The 90% coverage threshold is enforced in CI via `npm run coverage`. TypeScript compilation is verified as part of every test run. The test convention is consistent: one spec per module, flat `test()` calls only, absolute imports throughout. Skipped integration and e2e tests exist in `plgg-foundry` and `plgg-kit` to exercise LLM vendor adapters and the full foundry pipeline, but they require manual setup and environment variables and are excluded from CI.

## Gaps

Coverage thresholds for `plgg-foundry` and `plgg-kit` are not observed. Those packages declare `coverage.all: true` but no `thresholds` block, so low coverage in those packages does not fail CI. End-to-end tests that run `runFoundry` with a live LLM model in CI are not observed; all such tests are skipped. A dedicated test configuration file (e.g., `vitest.config.ts`) separate from `vite.config.ts` is not observed; test configuration is embedded in the shared Vite config. Test-level categorization via `describe` blocks or file naming convention beyond `.spec.ts` is not observed.
