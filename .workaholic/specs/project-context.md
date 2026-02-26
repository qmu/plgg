---
title: Project Context
description: Business context, stakeholder map, timeline status, active issues, and proposed solutions for plgg
category: developer
modified_at: 2026-02-26T04:17:53+09:00
commit_hash: ddbb696
---

# Project Context

Strategic analysis of the plgg monorepo for leader consumption. All claims are grounded in
observable project artifacts. Absent information is marked "not observed."

## Business Domain

**What it does**: plgg is a TypeScript functional programming utility library organized as a
monorepo. It provides three published packages:

- `plgg` (v0.0.25) — pipeline utility library with functional programming primitives (chain,
  Result types, type casting, Dict, Vec, etc.)
- `plgg-foundry` (v0.0.1) — AI-powered workflow orchestration using LLM structured outputs to
  dynamically compose operation sequences from user-defined "Apparatuses"
- `plgg-kit` (v0.0.1) — LLM vendor abstractions (OpenAI, Anthropic, Google) with
  `generateObject` utility, extracted from plgg-foundry

**Market category**: Experimental open-source TypeScript libraries for functional programming
and AI workflow orchestration.

**Value proposition**: Composable, type-safe functional primitives for pipeline construction;
LLM-driven workflow generation that removes the need to hand-write execution graphs.

**Stability warning**: README.md (line 3) explicitly marks the project "UNSTABLE — experimental
study work focused on functional programming concepts. Primarily intended for our own projects,
though publicly available."

**Source**: `README.md` line 3, `src/plgg/package.json`, `src/plgg-foundry/package.json`,
`src/plgg-kit/package.json`.

**Confidence**: high

---

## Stakeholder Map

| Stakeholder | Evidence | Concerns | Priority |
|---|---|---|---|
| Primary maintainer (`a@qmu.jp` / `@tamurayoshiya`) | Ticket author field, PR #6 checklist (`@tamurayoshiya`), commit author | Code quality, TypeScript strictness (CLAUDE.md prohibits `as`/`any`/`ts-ignore`), functional purity | High |
| Internal project consumers | README "primarily intended for our own projects" | API stability, correct behavior of plgg-foundry/plgg-kit integrations | High |
| Public npm consumers | Published packages on npm, public GitHub repo | Installation experience, documented API surface | Medium |
| Dependabot | Open PRs #8, #9, #10 | Dependency currency and security | Low |

**Not observed**: External contributor community, funded sponsors, SLAs, enterprise users.

**Confidence**: medium (inferred from artifacts; no explicit stakeholder declarations found)

---

## Timeline Status

### Current Versions

| Package | Version | Status |
|---|---|---|
| `plgg` | 0.0.25 | Unreleased (CHANGELOG marks as Unreleased) |
| `plgg-foundry` | 0.0.1 | Unreleased |
| `plgg-kit` | 0.0.1 | Unreleased |

### Release Cadence

One git tag observed: `2025.07.week1.release1`. No regular cadence pattern can be inferred
from a single tag. Release appears to be event-driven, not scheduled.

**Source**: `git tag --sort=-version:refname`, CHANGELOG files.

### Recent Milestones

- `v0.0.25` branch merged to main (commit `60dc186`): Added `plgg-kit` package extraction,
  `bind`/`env`/`unbox` functions, subagent commit workflow with `changelog-updater` and
  `readme-updater` agents.
- `drive-20260226-032733` branch (current): Committed `.claude/settings.json` for
  project-level Claude Code configuration (housekeeping, effort 0.1h).

### Active Release Candidate

PR #6 "Release Candidate 2025-12-22 15:02:52 +0900" (https://github.com/qmu/plgg/pull/6)
has been open since 2025-07-01. State: OPEN. Auto-merge: disabled. Checklist items #5
(`@tamurayoshiya`) and #7 (`@dependabot`) not completed.

**Confidence**: medium (release process not fully documented; single tag limits cadence
inference)

---

## Active Issues

### Issue 1: Release Candidate PR Stalled (Severity: High)

PR #6 has been open since 2025-07-01 (nearly 8 months). It targets `main` but has
auto-merge disabled. The checklist shows two incomplete items. No packages have a released
(non-Unreleased) version in their CHANGELOGs.

**Source**: `gh pr list`, PR #6 checklist, CHANGELOG files.

### Issue 2: Dependabot PRs Unmerged (Severity: Medium)

Three Dependabot PRs are open:
- PR #8: `glob` bump in `src/example` (open since 2025-11-20)
- PR #9: `glob` bump in `src/plgg-foundry` (open since 2025-12-22)
- PR #10: `lodash` bump in `src/example` (open since 2026-01-23)

`lodash` bump is a potential security concern (`lodash` 4.17.21 has known prototype pollution
vulnerabilities).

**Source**: `gh pr list`.

### Issue 3: No `.workaholic/specs/` Documents Exist (Severity: Medium)

The `write-spec` skill gather script returned an empty `=== SPECS ===` section. No
architecture viewpoint documents (`stakeholder.md`, `component.md`, etc.) exist in
`.workaholic/specs/`. Leaders operating in this codebase lack structured reference material.

**Source**: gather.sh output `=== SPECS ===` (empty).

### Issue 4: `src/plgg/README.md` Does Not Reflect Current Monorepo (Severity: Low)

`src/plgg/README.md` describes only `src/plgg/` and `src/example/` in its Project Structure
section. It omits `plgg-kit` and `plgg-foundry`, which are established packages. The root
`README.md` is accurate.

**Source**: `src/plgg/README.md` lines 6-12 vs. root `README.md` lines 6-13.

### Issue 5: `plgg-foundry` README Uses Outdated API Pattern (Severity: Low)

`src/plgg-foundry/README.md` Complete Example (line 189) calls `runFoundry(foundrySpec)(orderSpec)` and calls `result.isOk()` as a method. However, the plgg v0.0.25 CHANGELOG notes a breaking change renaming box constructors and pattern matchers (e.g., `ok$`/`err$` pattern). The example may not compile against the current API without verification.

**Source**: `src/plgg-foundry/README.md` lines 188-199, `src/plgg/CHANGELOG.md` lines 41-42.

### Issue 6: `plgg-kit` README Uses `result.isOk()` Method Pattern (Severity: Low)

Same as Issue 5 — `src/plgg-kit/README.md` line 53 calls `result.isOk()`. This method-style
pattern may not match the current `plgg` Result API (which uses `ok$`/`err$` pattern matchers
and functional style).

**Source**: `src/plgg-kit/README.md` line 53.

**Confidence**: high for issues 1–4; medium for issues 5–6 (requires TypeScript compilation
check to confirm)

---

## Proposed Solutions

### For Issue 1 (Release Candidate Stalled)

Establish an explicit release policy: define what conditions must be met for PR #6 to merge
(test pass, all CHANGELOG Unreleased entries finalized, dependabot PRs resolved). Document
this as a project constraint. Assign a target date.

### For Issue 2 (Dependabot PRs)

Review and merge Dependabot PRs in order of severity. `lodash` (PR #10) is highest priority
due to known CVEs. `glob` bumps (#8, #9) are lower risk. Merging these unblocks PR #6
checklist item #7.

### For Issue 3 (Missing Spec Documents)

Initialize the 8 viewpoint spec files (`stakeholder.md`, `model.md`, `usecase.md`,
`infrastructure.md`, `application.md`, `component.md`, `data.md`, `feature.md`) in
`.workaholic/specs/` using the write-spec skill. This is a documentation sprint task, not
a code change.

### For Issue 4 (`src/plgg/README.md` Stale)

Update `src/plgg/README.md` Project Structure section to list all four source packages
(`plgg`, `plgg-foundry`, `plgg-kit`, `example`). Low effort change; can accompany the next
commit.

### For Issues 5 and 6 (API Pattern Verification)

Run `sh/tsc-plgg.sh` against the example usage to confirm whether the `result.isOk()`
method pattern still compiles. If it does not, update README code examples to use the
current `ok$`/`err$` functional pattern. If it does, document that `isOk()` method is
retained for compatibility.
