# Review: direction-v1.md

**Reviewer**: Constructor
**Perspective**: Technical accountability
**Verdict**: APPROVE with minor observations

---

## Strengths

1. **Correct problem framing**: The Direction correctly identifies this as a structural investment, not a feature. The distinction matters because it sets appropriate expectations for deliverables — no new capabilities, but a more trustworthy internal structure.

2. **Accurate stakeholder analysis**: The four stakeholder groups (consumers, contributors, extension authors, owner) are realistic and their needs are technically grounded. The "success looks like" statements are testable.

3. **Well-scoped success criteria**: All 5 criteria are verifiable with existing tooling (`sh/tsc-plgg.sh`, `sh/test-plgg.sh`, grep for `as`/`any`/`ts-ignore`). This is exactly what a Constructor needs to know "when we're done."

4. **Risk balance is honest**: The Direction acknowledges both risks of refactoring AND risks of not refactoring, which prevents analysis paralysis.

## Technical Observations

### 1. Foundation "self-referencing" framing is slightly imprecise

> "When a foundation library depends on its own higher-level abstractions, it creates circular reasoning in the dependency graph"

The PLGG foundation currently uses path-aliased self-imports (`import from "plgg/index"`) but these are resolved within the same package. This is standard module organization, not circular dependency. The actual concern — which the Direction implicitly addresses — is that PLGG should not import from Kit or Foundry. The current codebase already satisfies this. The real layering issue is in the other direction: Kit and Foundry not fully using PLGG.

**Impact**: None on direction. Just a framing clarification.

### 2. "Minimize self-referencing for performance" needs nuance

The user instruction says PLGG "should mostly not use itself (for performance)." In practice, the PLGG foundation MUST use its own primitives to define higher types (e.g., `Result` is defined using `Ok` and `Err`, `Option` uses `Some` and `None`). The performance concern is about avoiding unnecessary abstraction layers in hot paths (e.g., `pipe` implementation uses raw reduce, not PLGG types). The Direction should clarify that "self-usage" is fine for type composition but should be avoided in runtime hot paths.

**Impact**: Low — the intent is correct, just the wording could mislead implementation.

### 3. Success criterion #5 (module clarity) is subjective

> "Each of the 11 module categories in plgg core has a clear, non-overlapping responsibility."

The 11 categories already exist and are already clear. This criterion is satisfied by the current codebase. If the intent is to validate they REMAIN clear after refactoring, state that explicitly.

**Impact**: Clarification only.

## Alignment with Design

The Direction's success criteria align perfectly with the Design's 4 phases:
- Criterion #2 (extension reuse) -> Phase 1 + Phase 3
- Criterion #4 (zero regression) -> Testing strategy
- Criterion #1 (foundation self-containment) -> Already satisfied, verified during implementation

No conflicts between Direction and Design.

## Conclusion

The Direction provides a sound business rationale that supports the technical work. The success criteria are concrete and measurable. Approved for the planning phase with the observations noted above for the Planner's consideration.
