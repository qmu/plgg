---
manager: quality-manager
last_updated: 2026-02-26T04:19:52+09:00
---

# Quality

The quality manager's territory spans type correctness, test coverage, formatting consistency, and CI enforcement across all packages in the plgg monorepo (`plgg`, `plgg-kit`, `plgg-foundry`).

## Type Escape Prohibition

**Bounds**: No use of `as`, `any`, or `@ts-ignore` as a solution to type errors in any TypeScript source file across all packages.

**Rationale**: These escape hatches bypass the strict TypeScript compiler settings that are the project's primary correctness guarantee. Once permitted, they erode the type safety invariants that the entire library design depends on.

**Affects**: All leader agents modifying TypeScript source files (quality-lead, any implementation leader).

**Criterion**: A source file is compliant if `git grep -n 'as any\|@ts-ignore\| as .*[A-Z]' src/` returns no results in project source directories. `tsc --noEmit` must exit 0. Compliant if both conditions hold.

**Review trigger**: Revisit if a new TypeScript major version introduces safer alternatives (e.g., `satisfies` operator already exists; any future constructs should be evaluated before adding exceptions).

---

## TypeScript Strict Mode

**Bounds**: All packages must maintain the full strict compiler flag set defined in `src/plgg/tsconfig.json`. No flag in this set may be removed or set to `false`. The set includes: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`, `allowUnreachableCode: false`, `allowUnusedLabels: false`, `allowJs: false`, `isolatedModules`, `erasableSyntaxOnly`.

**Rationale**: Consistent strict mode across packages ensures that types are portable between `plgg`, `plgg-kit`, and `plgg-foundry` without silent coercion. Allowing relaxed flags in one package creates boundary mismatches.

**Affects**: quality-lead, any leader modifying `tsconfig.json` files.

**Criterion**: Compliant if `diff src/plgg/tsconfig.json src/plgg-foundry/tsconfig.json` and `diff src/plgg/tsconfig.json src/plgg-kit/tsconfig.json` show no differences in `compilerOptions` flags (path-specific fields like `paths`, `rootDir`, `outDir` are excluded).

**Review trigger**: Revisit when TypeScript releases a new flag that becomes part of `strict` or that the project adopts.

---

## Test Coverage Thresholds

**Bounds**: All packages (`plgg`, `plgg-foundry`, `plgg-kit`) must configure vitest coverage thresholds of at minimum 90% for statements, branches, functions, and lines. The `plgg` package already enforces this in `src/plgg/vite.config.ts`. `plgg-foundry` and `plgg-kit` are currently unconstrained.

**Rationale**: Unconstrained coverage in satellite packages (`plgg-kit`, `plgg-foundry`) creates an asymmetric quality bar. Changes to these packages can regress without any automated signal.

**Affects**: quality-lead, test-lead.

**Criterion**: Compliant if `src/plgg-foundry/vite.config.ts` and `src/plgg-kit/vite.config.ts` each contain a `thresholds` block with `statements`, `branches`, `functions`, and `lines` all set to at least 90, AND `npm run coverage` exits 0 in each package.

**Review trigger**: Revisit after the `Abstracts/Principals` and `Abstracts/Servables` coverage exclusion issue in `plgg` is resolved. Consider whether 90% remains the appropriate floor or should increase.

---

## Coverage Scope Exclusions

**Bounds**: Abstract interface-only files that contain no executable statements (e.g., `Abstracts/Principals/*.ts`, `Abstracts/Servables/*.ts` in `plgg`) must be listed in the coverage `exclude` array in `vite.config.ts`. They must not be counted against threshold compliance.

**Rationale**: Interface-only TypeScript files produce 0% coverage by definition because there is no executable code. Including them causes the coverage report to fail thresholds for `plgg` currently (statements and lines at 89.81% vs. 90% threshold), which is a false signal about test quality.

**Affects**: quality-lead, test-lead.

**Criterion**: Compliant if `npm run coverage` exits 0 in `src/plgg` AND all files with 0% coverage in the report are files that contain only type-level constructs (interfaces, type aliases, abstract declarations with no implementation).

**Review trigger**: Revisit whenever a new abstract-only module is added to any package, to ensure the exclusion list remains complete.

---

## CI Test Scope

**Bounds**: The CI workflow `run-tests.yml` must execute tests for all packages that have a test suite. Currently, only `src/plgg` is tested in CI. `src/plgg-kit` and `src/plgg-foundry` are unconstrained — their tests are not run in CI.

**Rationale**: Changes to `plgg-kit` or `plgg-foundry` can break their own test suites without any CI signal. The absence of CI coverage for these packages means regressions are only detected locally.

**Affects**: quality-lead, test-lead.

**Criterion**: Compliant if `.github/workflows/run-tests.yml` contains steps that install dependencies and run `npm test` for each of `src/plgg`, `src/plgg-kit`, and `src/plgg-foundry`.

**Review trigger**: Revisit when `plgg-foundry` test suite depends on external services (e.g., LLM APIs); decide whether to run with mocks or skip in CI.

---

## Formatting Enforcement

**Bounds**: Prettier configuration (`printWidth: 50`, `semi: true`, `singleQuote: false`, `trailingComma: "all"`, `bracketSameLine: false`) is consistent across all packages and must not diverge. Automated enforcement mechanism is currently unconstrained — no CI check or pre-commit hook enforces formatting.

**Rationale**: Prettier is configured consistently across three `.prettierrc.json` files but is never checked automatically. Formatting drift will occur silently.

**Affects**: quality-lead.

**Criterion**: Compliant once one of the following is true: (a) `prettier --check` runs in CI on all package source directories and exits 0, OR (b) a pre-commit hook runs `prettier --write` on staged files. Currently: not compliant (no automated check exists).

**Review trigger**: Revisit when a pre-commit hook framework (e.g., husky + lint-staged) is introduced to the project, or when a CI formatting check is added.

---

## Unconstrained by Design

The following areas were analyzed and found to have no constraint, intentionally documented as unconstrained at this time:

- **Code linting (ESLint/Biome)**: No linter is configured. TypeScript strict mode serves as the primary static analysis layer. Adding a linter is not constrained — teams may introduce one independently.
- **Dependency vulnerability scanning**: No `npm audit` runs in CI. This is unconstrained; teams may add it to CI workflows.
- **Accessibility**: Not applicable to this library project (no UI components).
- **Performance budgets**: Not observed. Bundle size is not measured in CI. Unconstrained pending a decision on bundle size targets.
- **Documentation completeness**: PR template checklists are manual. No automated documentation linting. Unconstrained.
- **CI trigger on every PR push**: The `ci-testing` label requirement means CI does not run on all PR pushes. This is unconstrained — the current model is intentional (review-gated CI) but not formally decided as a constraint.
