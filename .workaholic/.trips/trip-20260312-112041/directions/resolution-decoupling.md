# Resolution: Foundry-Kit Decoupling and Secondary Disagreements

**Author**: Planner (Mediator)
**Status**: proposed
**Disagreement**: Architect vs. Constructor on Foundry-Kit dependency

---

## 1. Primary Disagreement: Foundry-Kit Decoupling

### Positions

**Architect**: Decouple now. Define a `GenerateAlignmentFn` function type in Foundry (~30 lines), remove the direct Kit import, and let Kit provide the concrete adapter. This satisfies Criterion #3 (no lateral dependencies) with minimal structural change.

**Constructor**: Defer. The dependency follows correct layering direction (higher depends on lower), is architecturally intentional (Foundry IS an AI orchestrator that needs LLMs), and decoupling would break the public API.

**Planner (earlier)**: Recommended deferral with resolution criteria, arguing the decoupling solves a hypothetical problem (non-Kit LLM providers) at the cost of real usability.

### Reassessment

The Architect's concrete proposal changes my assessment materially. My earlier concern was that decoupling would be a major restructuring that increases integration friction. A ~30-line function type extraction is not that. Let me re-evaluate against the four stakeholder personas:

- **Library consumers**: The `makeFoundry` API changes from `provider: Provider` to `generateObject: GenerateAlignmentFn`. This is a breaking change, but the library is at v0.0.1 with an "UNSTABLE" banner. Pre-1.0 is exactly when breaking changes should happen. Consumers who update will need to pass `kitGenerateObject(openai("gpt-5.1"))` instead of `openai("gpt-5.1")` — one line of adaptation.

- **Extension authors**: This is unambiguously positive. Foundry becomes usable with any LLM client, not just Kit. This opens Foundry to a wider audience without requiring Kit adoption.

- **Contributors**: The dependency graph becomes cleaner. A contributor working on Foundry no longer needs to understand Kit to comprehend Foundry's type contracts.

- **Project owner**: The library's positioning as a layered ecosystem becomes enforceable rather than aspirational. Criterion #3 from my Direction is satisfied without deferral.

### Verdict: Accept the Architect's Proposal

The Architect is right. The effort is minimal (~30 lines), the benefit is real (clean dependency direction), and the cost (one-line API migration for consumers) is appropriate at v0.0.1. My earlier deferral recommendation was based on an assumption that decoupling would be expensive. It isn't.

The Constructor's concern about breaking the public API is valid but misweighted for a v0.0.1 library. The "UNSTABLE" banner exists precisely to allow this kind of structural improvement before consumers build on a compromised foundation.

### Conditions

1. Kit must provide a ready-made adapter so that the default usage pattern remains simple. The consumer experience should be: `import { kitGenerateObject } from "plgg-kit"` — no assembly required for the standard case.
2. The Foundry README (or equivalent documentation) must show the standard Kit integration as the primary example, so consumers aren't confused by the abstraction layer.

### Impact on Success Criteria

- **Criterion #1 (Foundation self-containment)**: No change — Foundation is already self-contained.
- **Criterion #2 (Extension reuse)**: Strengthened — Foundry now defines its LLM contract in PLGG types rather than importing Kit types.
- **Criterion #3 (Dependency direction)**: Fully satisfied — no more lateral Foundry->Kit dependency.
- **Criterion #4 (Zero regression)**: Requires test updates for the new API surface, but no behavioral change.
- **Criterion #5 (Module clarity)**: Improved — Foundry's boundary is crisper.

---

## 2. Secondary Disagreement: Phase 1 Scope and Naming

### Phase 1 Scope

**Architect's position**: Only 3 `make*` types are needed (`makeStr`, `makeKebabCase`, `makeBool`) based on actual usage in Foundry.

**Verdict**: Accept the Architect's scoping. Adding 23 `make*` functions when only 3 are used is speculative generalization — exactly the kind of over-engineering my Direction warned against in the "Minimal" criterion. Build what is needed now. If more `make*` functions become necessary in future extensions, add them then.

### Naming Convention

**My earlier concern**: `make*` introduces a throwing pattern into a Result-oriented library, creating messaging inconsistency.

**Revised position**: The naming concern remains valid but should not block progress. I propose the following resolution:

- **Use `unsafeStr`, `unsafeKebabCase`, `unsafeBool`** as the function names. The `unsafe` prefix is a well-established convention (Rust, Haskell) that immediately communicates "this function bypasses the normal safety guarantees." It is self-documenting and requires no additional explanation.
- **Alternative**: If the team finds `unsafe` too alarming for a construction-time assertion, `assertStr` / `assertKebabCase` / `assertBool` is acceptable. The key requirement is that the name signals "this is not the normal path."
- **Do not use `make*`**: The `make` prefix suggests a standard factory with no unusual behavior. It hides the throwing semantics.

The team should converge on one prefix. I recommend `unsafe*` but will accept `assert*`.

---

## 3. Secondary Disagreement: Missing Gap Coverage

### G7: Kind.ts `@ts-ignore`

**Verdict**: Include in scope. This is a foundation-level violation of the project's most important rule. The fix is trivial (remove the empty `MapKind3` interface or populate it). Leaving a `@ts-ignore` in the foundation while refactoring for "proper layering" would be contradictory.

### G10: Stray TodoFoundry.ts

**Verdict**: Include in scope. Moving or removing a misplaced file is low-effort, low-risk, and directly serves the "well-organized" goal. It's a symbolic win that costs nothing.

### G8: Commented-out asProvider

**Verdict**: Include in scope as part of the decoupling work. If we're extracting `GenerateAlignmentFn` from Foundry, the Provider type's cast chain should be complete. A commented-out `asProvider` is incomplete work that undermines Kit's credibility as a properly layered extension.

### G9: JSON handling duplication in operate.ts

**Verdict**: Defer. This is a real gap but lower priority than the type safety and dependency direction fixes. It can be addressed in a follow-up iteration without compromising the current refactoring's success criteria.

---

## 4. Summary of Mediated Outcomes

| Issue | Verdict | Rationale |
|-------|---------|-----------|
| Foundry-Kit decoupling | **Accept Architect's proposal** | Minimal effort (~30 lines), real benefit, appropriate for v0.0.1 |
| Phase 1 scope | **3 types only** (per Architect) | Build what's needed, not what's speculative |
| Naming convention | **`unsafe*` prefix** (or `assert*`) | Must signal throwing behavior; `make*` hides it |
| G7 (@ts-ignore) | **In scope** | Foundation rule violation, trivial fix |
| G8 (asProvider) | **In scope** | Completes Kit layering alongside decoupling |
| G9 (JSON duplication) | **Defer** | Lower priority, no impact on success criteria |
| G10 (stray file) | **In scope** | Low-effort hygiene, symbolic value |
