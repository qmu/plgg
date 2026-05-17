# Review: direction-v1.md

**Reviewer**: Architect
**Artifact**: directions/direction-v1.md (Planner)
**Date**: 2026-03-12

## Overall Assessment

The Direction is well-reasoned and structurally sound. The business rationale, stakeholder analysis, and success criteria accurately reflect the codebase reality identified in the Model. The document provides clear guardrails for scope control.

**Verdict**: APPROVE with minor observations.

---

## Alignment with Model

### Confirmed by codebase analysis

1. **Foundation self-containment** (Success Criterion #1): Confirmed. PLGG foundation has zero external deps and does not import from Kit or Foundry. The only deviation is `Kind.ts:16` which uses `@ts-ignore` — a minor internal issue, not a layering violation.

2. **Extension reuse gaps** (Success Criterion #2): Confirmed. The Model identifies 10 structural gaps (G1-G10) where Foundry bypasses PLGG patterns. The Direction's framing of "duplicated logic, inconsistent error handling patterns, and diverging type contracts" is accurate.

3. **Dependency direction** (Success Criterion #3): The Direction states the flow should be `plgg <- plgg-kit <- plgg-foundry`. The Model confirms that the **current** graph is `plgg <- plgg-kit` and `plgg <- plgg-foundry -> plgg-kit` (sideways dependency). This is the primary structural violation.

### Potential tension

**Success Criterion #3 vs. Design Phase 5**: The Direction explicitly states "No reverse or lateral dependencies exist" as a success criterion. However, the Design (Constructor) defers the Foundry-Kit decoupling in Phase 5, calling the dependency "architecturally intentional." These two positions are in tension.

From a structural perspective, the Direction is correct that this lateral dependency should be resolved. But the Design is also correct that the scope should be bounded. My recommendation:

> **Structural alternative**: The Foundry-Kit coupling can be decoupled without major effort by introducing a function type abstraction. Foundry's `Foundry` type would accept a `generateObject: (...) => PromisedResult<unknown, Error>` function instead of `provider: Provider`. Kit would then provide an adapter: `kitGenerateObject(openai("gpt-5.1"))`. This is ~30 lines of change, not a major architectural lift. It should be in scope.

---

## Observations

### Strengths

1. **"Not a feature initiative"** framing is correct and prevents scope creep into new functionality.
2. **Stakeholder analysis** is concrete and testable — each "success looks like" statement maps to verifiable code properties.
3. **Risk of NOT refactoring** section provides the business justification for the work.
4. **"Well-organized" definition** (Traceable, Predictable, Separable, Minimal) provides a structural vocabulary the team can use during review.

### Minor observations

1. The Direction mentions "performance penalties" from self-referencing in the foundation. In the current codebase, PLGG foundation uses path-aliased self-imports (`plgg/index`, `plgg/Abstracts/...`) which resolve within the same package. These are not true circular dependencies — they're just barrel re-exports. The performance concern is valid for tree-shaking scenarios (a consumer importing one type gets the entire export surface), but it's not the same as circular imports. The Direction should be precise about which performance concern applies.

2. The success criteria don't mention the `@ts-ignore` in `Kind.ts:16`. While minor, this is a CLAUDE.md violation that should be addressed as part of "zero regression" criterion.

---

## Conclusion

The Direction faithfully represents the business intent behind the refactoring and provides clear success criteria. The one structural tension (Criterion #3 vs. Design Phase 5) should be resolved in the consensus phase. The Foundry-Kit decoupling is achievable within this iteration's scope.
