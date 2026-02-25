---
manager: project-manager
last_updated: 2026-02-26T04:17:53+09:00
---

# Project

plgg is an experimental TypeScript monorepo (plgg, plgg-foundry, plgg-kit) primarily intended
for internal use, marked UNSTABLE. The project manager sets constraints that bound release
decisions, dependency hygiene, and documentation scope.

## TypeScript Type Safety

**Bounds**: Forbids use of `as`, `any`, and `ts-ignore` as solutions to type errors in any
TypeScript source file across all packages.

**Rationale**: Explicitly stated as "THE MOST IMPORTANT RULE" in CLAUDE.md (line 1). Type
unsafety masks real errors and undermines the project's functional programming correctness
guarantees.

**Affects**: delivery-lead, any leader or developer writing TypeScript source code.

**Criterion**: `sh/tsc-plgg.sh` exits 0 with no suppressed type errors. No `as`, `any`, or
`@ts-ignore` appears as a fix in committed source files.

**Review trigger**: Revisit if TypeScript introduces a built-in mechanism that provides
equivalent safety without suppression.

---

## Compilation and Test Gate

**Bounds**: No commit to `main` or any integration branch may leave the TypeScript compiler
or test suite in a failing state.

**Rationale**: CLAUDE.md specifies `sh/tsc-plgg.sh` for compilation and `sh/test-plgg.sh`
for testing. These are the project's defined quality gates.

**Affects**: delivery-lead, any agent or developer producing commits.

**Criterion**: Both `sh/tsc-plgg.sh` and `sh/test-plgg.sh` exit 0 before merging.

**Review trigger**: Revisit if additional packages (beyond plgg) get their own dedicated gate
scripts.

---

## Release Readiness

**Bounds**: A package version must not be marked "Unreleased" in its CHANGELOG when the
release candidate PR merges to `main`. All three packages (plgg, plgg-foundry, plgg-kit)
must resolve their Unreleased entries before the PR #6 merge.

**Rationale**: PR #6 has been open since 2025-07-01 with no released versions in any package.
Merging without resolving Unreleased entries leaves the changelog in a permanently stale state.

**Affects**: delivery-lead.

**Criterion**: CHANGELOG `## [Unreleased]` or `## [x.y.z] - Unreleased` sections are replaced
with dated release entries before merging to `main`.

**Review trigger**: Revisit after the first successful release of all three packages.

---

## Dependency Currency

**Bounds**: Dependabot PRs for security-relevant packages (`lodash` and equivalents) must be
merged or explicitly rejected within 30 days of opening.

**Rationale**: PR #10 (lodash bump) has been open since 2026-01-23. `lodash` 4.17.21 carries
known prototype pollution CVEs. Leaving security-relevant dependency bumps open is a project
hygiene risk (source: `gh pr list`).

**Affects**: delivery-lead, recovery-lead.

**Criterion**: No Dependabot PR for a package with a known CVE is open for more than 30 days.

**Review trigger**: Revisit if a dedicated security review process is established.

---

## Package Scope Stability

**Bounds**: The three published packages (`plgg`, `plgg-foundry`, `plgg-kit`) maintain their
current responsibility boundaries. `plgg` provides functional primitives. `plgg-kit` provides
LLM vendor abstractions. `plgg-foundry` provides workflow orchestration. Cross-package
responsibility migration requires a ticket and explicit decision record.

**Rationale**: `plgg-kit` was recently extracted from `plgg-foundry` (plgg-foundry CHANGELOG,
"Removed" section). Scope drift without documentation causes confusion for consumers and
breaks downstream imports.

**Affects**: architecture-lead, delivery-lead.

**Criterion**: Each package's `index.ts` only exports symbols belonging to its defined
responsibility. No new LLM vendor code appears in `plgg-foundry` directly.

**Review trigger**: Revisit if a fourth package is introduced or if `plgg-kit` is merged
back into `plgg-foundry`.

---

## Documentation Language

**Bounds**: All `.workaholic/` documents are written in English as the primary language, with
`_ja.md` translation counterparts required for every document created or updated.

**Rationale**: CLAUDE.md is written in English. The workaholic translate skill defaults to
English-primary with Japanese translation for projects where the primary language is English.

**Affects**: Any agent or developer writing to `.workaholic/`.

**Criterion**: Every `.md` file in `.workaholic/` has a corresponding `_ja.md` file. No
document exists in one language without its counterpart.

**Review trigger**: Revisit if the project's CLAUDE.md is updated to declare a different
primary language.

---

## Unconstrained by Design

The following areas were analyzed and found to have no current evidence justifying a
constraint. They are explicitly left unconstrained:

- **Release cadence**: No regular schedule observed (one tag in history). Releases are
  event-driven. Unconstrained by design until the project reaches stable API.
- **Contributor workflow**: No CONTRIBUTING.md or PR template observed. No external
  contributors identified. Unconstrained until the project attracts outside contributors.
- **Versioning strategy**: Packages are at 0.0.x. Semantic versioning intent is not
  documented. Unconstrained until first stable release.
