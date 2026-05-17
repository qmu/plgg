# Review: Design v1

**Reviewer**: Planner
**Artifact**: designs/design-v1.md
**Decision**: Approve with minor suggestions

## Assessment

The Design is pragmatic, well-scoped, and directly addresses the most visible violations. The phased approach with independent compilability at each stage is exactly what responsible delivery looks like — each phase can be verified before proceeding, reducing the risk of a cascading failure.

## Business Value Alignment

1. **Phase ordering is stakeholder-friendly**: Starting with additive `make*` functions (Phase 1) before modifying existing code (Phases 2-3) means the foundation gets stronger before anything gets rearranged. This is the lowest-risk path to measurable improvement.
2. **"Files Not Changed" section (Section 7)** is valuable. It explicitly bounds the scope, which prevents scope creep — one of the risks I flagged in the Direction. Stakeholders can see what is and isn't being touched.
3. **Testing strategy (Section 5)** is comprehensive and uses the existing test infrastructure. No new tooling is required, which minimizes delivery risk.

## Concern: `make*` Functions Introduce a Throwing Pattern

The `make*` factory functions (Phase 1) throw `InvalidError` on failure rather than returning `Result`. This introduces a second error-handling paradigm into a library whose entire identity is built on Result-based error handling.

**Business perspective**: PLGG's value proposition is "error handling without exceptions" (per the README). If the foundation itself includes functions that throw, this creates a messaging inconsistency. A contributor or consumer who sees `makeStr` might reasonably ask: "I thought this library doesn't throw?"

**The trade-off**: The Constructor correctly identifies that `make*` is for cases where "the caller asserts validity." This is a legitimate use case — construction-time validation where failure indicates a programming error, not a runtime condition. But the distinction is subtle and may confuse users who are learning the library's patterns.

**Proposal**: Consider two alternatives:
1. **Name them assertively**: Use `unsafeStr` or `assertStr` instead of `makeStr` to signal that these functions break the Result convention intentionally. The name carries the warning.
2. **Keep them internal to extensions**: If `make*` is only needed by Foundry's construction code, consider not exporting them from plgg's public API. This limits the blast radius of the pattern deviation.

Either way, document the design intent clearly so contributors understand when to use `make*` vs. `as*`.

## Concern: Phase 5 Deferral Without Resolution Criteria

Phase 5 (Foundry-Kit decoupling) is marked "DEFERRED" with the rationale that "the dependency is legitimate and well-bounded." The Architect's Model, however, identifies this as "the key structural issue" (Section 5.2).

**Business perspective**: Deferral is appropriate when the cost of action exceeds the benefit. But deferral without resolution criteria becomes permanent avoidance. If the team agrees to defer, we should define what would trigger revisiting it (e.g., "when a second Kit-independent consumer of Foundry emerges" or "when the user explicitly requests it").

**Proposal**: Add a brief note to Phase 5 stating the conditions under which decoupling would be reconsidered. This preserves the Architect's insight without forcing premature action.

## Observation: Test File `as any` Not Addressed

The Design explicitly scopes its `as` elimination to source files, excluding spec files. The Model identified 8 `as any` in plgg tests and additional occurrences in foundry tests. While test-file violations are less critical than source violations, they represent a quality debt that may mislead contributors studying tests as API documentation.

**Proposal**: Add a lightweight Phase 4.5 or post-refactoring cleanup pass that addresses test-file `as any` where feasible. This doesn't need to block the main delivery but should be tracked.

## Observation: Alignment with Model Gaps

The Design addresses the following Model gaps directly:

| Model Gap | Design Phase | Status |
|-----------|-------------|--------|
| G1 (Param type) | Phase 2 | Addressed |
| G2 (Env type) | Phase 2 | Addressed |
| G3 (OperationContext) | Phase 2 | Partially addressed |
| G4 (operate.ts `as` casts) | Phase 2-3 | Addressed |
| G5 (Foundry-Kit coupling) | Phase 5 | Deferred |
| G6 (blueprint.ts Kit import) | Phase 5 | Deferred |
| G7 (Kind.ts @ts-ignore) | Not addressed | Missing |
| G8 (Provider missing cast) | Not addressed | Missing |
| G9 (JSON handling duplication) | Not addressed | Missing |
| G10 (Stray file) | Not addressed | Missing |

**Proposal**: G7 (Kind.ts `@ts-ignore`) should be included in this iteration since it is a foundation-level rule violation and the fix is likely trivial (remove the empty interface or populate it). G8, G9, and G10 are reasonable to defer but should be documented as known technical debt.

## Summary

The Design is solid, pragmatic, and well-sequenced. The main suggestions are: (1) reconsider the naming convention for `make*` to clearly signal the throwing behavior, (2) define resolution criteria for the deferred Foundry-Kit decoupling, and (3) include the Kind.ts `@ts-ignore` fix since it is a direct violation of the project's most important rule.
