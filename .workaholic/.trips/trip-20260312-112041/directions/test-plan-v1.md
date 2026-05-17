# E2E Test Plan v1

**Author**: Planner
**Status**: draft
**Scope**: External validation of PLGG refactoring (Design v2, Phases 1-6)

---

## Applicability Assessment

PLGG is a pure TypeScript library with no web UI, API endpoints, or CLI tool. Per the E2E Assurance Policy, "projects that are purely library or configuration may skip E2E testing" in the browser/Playwright sense.

However, the library has a clear external interface: its exports, its build artifacts, and its rule compliance. The Planner validates the refactoring from the **consumer and stakeholder perspective** — verifying that the system delivers on the success criteria defined in the Direction without inspecting internal code quality (that is the Architect's domain) or running unit tests (that is the Constructor's domain).

## Test Strategy

All tests are CLI-executable. Each scenario produces a binary pass/fail outcome.

---

## Scenario 1: Full System Coherence

**What**: Run `sh/check-all.sh` from the worktree root.

**Why**: This is the single most important validation. It runs type checking and tests for all three packages plus the example project, then builds. If this passes, the refactoring has not broken any existing behavior.

**Commands**:
```bash
cd /home/ec2-user/projects/plgg/.worktrees/trip-20260312-112041
sh/check-all.sh
```

**Pass criteria**: Exit code 0, no error output.

**Business value**: Confirms Criterion #4 (zero regression) from the Direction.

---

## Scenario 2: Zero `as` Assertions in Source Code

**What**: Grep all non-test TypeScript source files for ` as ` type assertions.

**Why**: The project's most important rule prohibits `as`, `any`, and `ts-ignore`. The refactoring's primary goal is to eliminate these violations. This test verifies the rule is satisfied from the outside — as a consumer auditing the library's quality.

**Commands**:
```bash
cd /home/ec2-user/projects/plgg/.worktrees/trip-20260312-112041

# Check for 'as' assertions in source files (excluding tests, node_modules, dist)
grep -rn ' as ' src/plgg/src/ src/plgg-kit/src/ src/plgg-foundry/src/ \
  --include='*.ts' \
  --exclude='*.spec.ts' \
  --exclude='*.test.ts' \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  | grep -v '// ' \
  | grep -v 'export { .* as ' \
  | grep -v 'import .* as '
```

**Pass criteria**: Zero matches (exit code 1 from grep, meaning no matches found). Legitimate uses of `as` in re-exports (`export { x as y }`) and namespace imports (`import * as x`) are excluded.

**Business value**: Confirms the library meets its own stated quality standard. A consumer auditing the dependency can verify compliance.

---

## Scenario 3: Zero `@ts-ignore` in Source Code

**What**: Grep all source files for `@ts-ignore`.

**Commands**:
```bash
cd /home/ec2-user/projects/plgg/.worktrees/trip-20260312-112041

grep -rn '@ts-ignore' src/plgg/src/ src/plgg-kit/src/ src/plgg-foundry/src/ \
  --include='*.ts' \
  --exclude='*.spec.ts' \
  --exclude-dir=node_modules \
  --exclude-dir=dist
```

**Pass criteria**: Zero matches.

**Business value**: Foundation-level rule compliance. Kind.ts G7 fix is verified.

---

## Scenario 4: Dependency Direction Enforcement

**What**: Verify `plgg-foundry/package.json` does not depend on `plgg-kit`.

**Why**: The decoupling (Phase 4) is the most consequential structural change. This test confirms the dependency graph flows strictly in one direction: plgg <- plgg-kit, plgg <- plgg-foundry — with no lateral Foundry->Kit dependency.

**Commands**:
```bash
cd /home/ec2-user/projects/plgg/.worktrees/trip-20260312-112041

# Check package.json for kit dependency
grep -c 'plgg-kit' src/plgg-foundry/package.json

# Check source imports for kit references
grep -rn 'from "plgg-kit"' src/plgg-foundry/src/ \
  --include='*.ts' \
  --exclude='*.spec.ts' \
  --exclude-dir=node_modules
```

**Pass criteria**: Both greps return zero matches.

**Business value**: Confirms Criterion #3 (dependency direction enforcement) from the Direction. Foundry is independently usable without Kit.

---

## Scenario 5: `unsafe*` Functions Are Accessible

**What**: Verify that the new `unsafe*` factory functions are exported from `plgg` and function correctly.

**Why**: These functions are the mechanism that enables `as` cast elimination. If they aren't properly exported, Foundry cannot import them, and the refactoring fails at the integration layer.

**Commands**:
```bash
cd /home/ec2-user/projects/plgg/.worktrees/trip-20260312-112041

# Verify exports exist in plgg barrel
grep -n 'unsafeStr\|unsafeKebabCase\|unsafeBool' src/plgg/src/index.ts
```

**Pass criteria**: All three functions appear in the barrel export.

**Business value**: Confirms the foundation provides the tools extensions need — Criterion #2 (extension reuse).

---

## Scenario 6: Kit Provides Adapter

**What**: Verify that `plgg-kit` exports an adapter function for Foundry's `GenerateAlignmentFn`.

**Why**: The mediation resolution required Kit to provide a ready-made adapter so consumers don't face increased integration friction. This is a stakeholder-facing commitment.

**Commands**:
```bash
cd /home/ec2-user/projects/plgg/.worktrees/trip-20260312-112041

# Verify adapter is exported from Kit
grep -rn 'asGenerateAlignmentFn\|generateAlignmentFn' src/plgg-kit/src/ \
  --include='*.ts' \
  --exclude='*.spec.ts'
```

**Pass criteria**: At least one match showing the adapter function is defined and exported.

**Business value**: Confirms the decoupling doesn't degrade the default usage experience — the consumer can still get a working Foundry with one import from Kit.

---

## Scenario 7: No Stray Files Outside `src/`

**What**: Check that there are no TypeScript source files outside the `src/` directory in any package.

**Commands**:
```bash
cd /home/ec2-user/projects/plgg/.worktrees/trip-20260312-112041

# Check for .ts files directly in package roots (outside src/)
find src/plgg-kit/ src/plgg-foundry/ -maxdepth 1 -name '*.ts' -not -name '*.config.*'
```

**Pass criteria**: Zero results. G10 (stray TodoFoundry.ts) is resolved.

**Business value**: Contributors can trust the file layout reflects the module architecture.

---

## Scenario 8: `asProvider` Cast Chain Is Complete

**What**: Verify that Kit's `asProvider` is implemented, not commented out.

**Commands**:
```bash
cd /home/ec2-user/projects/plgg/.worktrees/trip-20260312-112041

# Check asProvider is defined and not commented out
grep -n 'asProvider' src/plgg-kit/src/LLMs/model/Provider.ts
```

**Pass criteria**: `asProvider` appears as an active export (not preceded by `//`).

**Business value**: Kit's type construction is complete — consumers get proper validated Provider types.

---

## Execution Order

The scenarios are designed to run sequentially after the Constructor reports implementation complete:

1. **Scenario 1** (check-all.sh) — gate: if this fails, stop and report
2. **Scenarios 2-3** (rule compliance) — verify `as`/`@ts-ignore` elimination
3. **Scenario 4** (dependency direction) — verify decoupling
4. **Scenarios 5-8** (structural checks) — verify specific deliverables

If Scenario 1 fails, the remaining scenarios are still run for diagnostic value, but the overall verdict is **FAIL**.

## Overall Pass Criteria

All 8 scenarios pass. This confirms:
- Criterion #1: Foundation self-containment (no violations in plgg core)
- Criterion #2: Extension reuse (unsafe* functions enable proper Foundry construction)
- Criterion #3: Dependency direction (Foundry does not import Kit)
- Criterion #4: Zero regression (check-all.sh passes)
- Criterion #5: Module clarity (no stray files, complete cast chains)
