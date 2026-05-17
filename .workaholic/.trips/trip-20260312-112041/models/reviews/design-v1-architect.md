# Review: design-v1.md

**Reviewer**: Architect
**Artifact**: designs/design-v1.md (Constructor)
**Date**: 2026-03-12

## Overall Assessment

The Design is technically precise and correctly identifies the most critical violations. The phased approach with independent compilability per phase is good engineering discipline. However, the Design has notable scope gaps and one architectural disagreement.

**Verdict**: APPROVE WITH CHANGES. Three issues must be resolved before implementation.

---

## Issue 1: Foundry-Kit Decoupling Should Not Be Deferred (DISAGREEMENT)

**Design says** (Phase 5): "Do not decouple in this iteration. The dependency is legitimate and well-bounded."

**Architect position**: This contradicts the Direction's Success Criterion #3 ("No reverse or lateral dependencies exist"). The coupling is **not** architecturally inevitable — it's a design choice that can be resolved with minimal effort.

**Structural alternative**:

```typescript
// In plgg-foundry: Define an abstract generation function type
export type GenerateAlignmentFn = (args: {
  systemPrompt: string;
  userPrompt: string;
  schema: Datum;
}) => PromisedResult<unknown, Error>;

// Foundry type becomes Kit-independent
export type Foundry = Readonly<{
  description: Str;
  maxOperationLimit: number;
  apparatuses: ReadonlyArray<Apparatus>;
  generateAlignment: GenerateAlignmentFn;
  beforeOperations?: BeforeOperations;
  afterOperations?: AfterOperations;
}>;
```

Then in plgg-kit, provide the adapter:
```typescript
// In plgg-kit: Adapter that connects Kit's LLM to Foundry's abstraction
export const createGenerateAlignment = (provider: Provider): GenerateAlignmentFn =>
  ({ systemPrompt, userPrompt, schema }) =>
    generateObject({ provider, systemPrompt, userPrompt, schema });
```

User composition:
```typescript
import { makeFoundry } from "plgg-foundry";
import { createGenerateAlignment, openai } from "plgg-kit";

const foundry = makeFoundry({
  description: "My foundry",
  apparatuses: [...],
  generateAlignment: createGenerateAlignment(openai("gpt-5.1")),
});
```

**Impact**: ~30 lines of change. Removes `plgg-kit` from `plgg-foundry/package.json` dependencies. This should be a Phase 2.5 or merged into Phase 2.

**Why it matters**: If we complete the refactoring without this change, Success Criterion #3 from the Direction remains unmet. The Planner will rightfully flag this in E2E validation.

---

## Issue 2: Missing Scope Items (GAPS)

The Design addresses `as` cast violations and `Param` typing but omits several gaps identified in the Model:

| Gap | Model Ref | Status in Design |
|-----|-----------|-----------------|
| `@ts-ignore` in Kind.ts (MapKind3) | G7 | **Not addressed** |
| Stray `plgg-kit/TodoFoundry.ts` outside src/ | G10 | **Not addressed** |
| Commented-out `asProvider` in Provider.ts | G8 | **Not addressed** |
| Foundry JSON handling (`toJsonString`/`parseJsonValue`) duplicates JsonReady | G9 | **Not addressed** |

**Recommendations**:

1. **G7 (`@ts-ignore`)**: Remove the `MapKind3` interface entirely (it's unused and the comment says "will have ReaderTaskResult" — there is no such type). Or remove the `@ts-ignore` and leave the empty interface if there's a future plan. This is a 1-line fix.

2. **G10 (stray file)**: `plgg-kit/TodoFoundry.ts` exists at the package root, outside `src/`. It appears to be an orphaned file. Remove or move it.

3. **G8 (`asProvider`)**: The commented-out `asProvider` in `Provider.ts` should either be implemented or removed. Commented-out code is dead weight.

4. **G9 (JSON handling)**: `toJsonString`/`parseJsonValue` in `operate.ts` partially reimplements PLGG's JsonReady system. This is lower priority but worth noting for future cleanup.

Items G7 and G10 are trivial and should be included. G8 and G9 are optional for this iteration.

---

## Issue 3: `make*` Pattern — Throwing vs. Result (DESIGN CONCERN)

The Design proposes `make*` functions that **throw** on invalid input:

```typescript
export const makeStr = (value: string): Str => {
  const result = asStr(value);
  if (isOk(result)) return result.content;
  throw new InvalidError({ message: "Cannot make Str from empty string" });
};
```

**Structural concern**: PLGG's philosophy is Result-based error handling throughout. Introducing throwing constructors creates a dual error model: some functions return `Result`, others throw. This is the exact kind of inconsistency the Direction warns against.

**However**, I acknowledge the practical need: Foundry code calling `makeFoundry({ description: "..." })` should not need to unwrap a Result for a literal string. The throwing behavior is acceptable **if**:

1. The `make*` functions are clearly documented as **asserting** constructors (for cases where the caller guarantees validity)
2. They are named consistently (the `make` prefix signals "I assert this is valid")
3. They co-exist with `as*` functions (which remain the safe alternative)

This is a pragmatic compromise. I accept the Design's approach with the naming convention understood.

---

## Strengths

1. **Violation catalog** in Section 2.3 is precise — file, line, violation, root cause. This is exactly the level of detail needed for implementation.
2. **Phase independence** is well-designed — each phase compiles and tests independently.
3. **"Files Not Changed"** section (Section 7) is valuable — it explicitly bounds the scope and protects performance-critical code.
4. **RegisterEntry type** (Phase 2) is the correct fix for the Param/Env typing problem. Distinguishing storage format from passed-to-function format is the right decomposition.
5. **Migration order diagram** clearly communicates dependencies between phases.

---

## Minor Observations

1. Design Section 2.1 says "No `as` cast violations found in Kit" — this is correct for source files but should note the commented-out `asProvider` as incomplete work.

2. Phase 1 estimates "~23 files" for `make*` additions. This may be overly broad — not all types need `make*`. Only the types actually used via `box(TAG)(value) as Type` in Foundry need them. From the violation catalog, that's: `Str`, `KebabCase`, and `Bool` (3 types, not 23). The Design should narrow the scope to only the types with demonstrated need.

3. The success criterion "Zero `as` type assertions in the codebase" (Section 8.1) needs clarification: does this include test files? The Model found 11 `as any` occurrences in spec files. Fixing test files is a separate effort from fixing source files.

---

## Summary of Required Changes

| Priority | Change | Effort |
|----------|--------|--------|
| **Must** | Add Foundry-Kit decoupling as a phase (not deferred) | ~30 lines |
| **Must** | Remove `@ts-ignore` from Kind.ts | 1 line |
| **Must** | Remove or relocate stray `plgg-kit/TodoFoundry.ts` | 1 file |
| **Should** | Narrow Phase 1 scope to only 3 needed `make*` types | Reduces work |
| **Should** | Clarify whether `as` elimination includes test files | Clarification |
| **Could** | Remove commented-out `asProvider` | 3 lines |
| **Could** | Address `toJsonString`/`parseJsonValue` duplication | Future work |
