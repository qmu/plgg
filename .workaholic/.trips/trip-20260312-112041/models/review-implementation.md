# Review: Implementation of PLGG Refactoring

**Reviewer**: Architect
**Date**: 2026-03-12
**Task**: #10 — Architectural review of Constructor's implementation
**Commits reviewed**: 77f565b, 91fd6cb, 14ece36, cd1a03b, 0ca4861, a8a4f92
**Diff baseline**: 06d1250 (main) → a8a4f92 (HEAD)

---

## Verdict: APPROVE WITH NOTES

The implementation faithfully executes the consensus-approved design. All critical violations are resolved. The three-layer dependency graph is correctly established. Two minor code quality items should be addressed.

---

## 1. Checklist Results

### 1.1 Zero `as` Assertions in Foundry/Kit Source Files — PASS

All 11 Foundry violations resolved:

| ID | Resolution | Verified |
|----|-----------|----------|
| V1 | `Foundry.ts:79` — `unsafeStr(spec.description)` | OK |
| V2 | `Processor.ts:74` — `unsafeKebabCase(spec.name)` | OK |
| V3 | `Processor.ts:75` — `unsafeStr(spec.description)` | OK |
| V4 | `Switcher.ts:95` — `unsafeKebabCase(spec.name)` | OK |
| V5 | `Switcher.ts:96` — `unsafeStr(spec.description)` | OK |
| V6 | `VirtualType.ts:38` — `unsafeStr(spec.type)` | OK |
| V7 | `VirtualType.ts:41` — `some(unsafeBool(spec.optional))` | OK |
| V8 | `VirtualType.ts:44` — `some(unsafeStr(spec.description))` | OK |
| V9 | `operate.ts:249` — `param.value` (via RegisterEntry typing) | OK |
| V10 | `operate.ts:370` — `param.value` (via RegisterEntry typing) | OK |
| V11 | `operate.ts:477` — `loaded[1].value` (via RegisterEntry typing) | OK |

No new `as` assertions introduced by this refactoring in Foundry or Kit source files.

**Note**: Pre-existing `as` casts exist in PLGG foundation files (`tryCatch.ts`, `atProp.ts`, `Pattern.ts`, `RawObj.ts`, `Dict.ts`, `ObjLike.ts`). These were out of scope per consensus but should be noted for future work. The model-v2 metric "plgg `as` violations: 0" was technically incorrect — these were not counted because model analysis focused on Foundry.

### 1.2 Zero `@ts-ignore` — PASS (with note)

The `@ts-ignore` in `Kind.ts:16` has been replaced with `@ts-expect-error`:

```typescript
// @ts-expect-error Type parameters reserved for module augmentation (e.g., ReaderTaskResult)
export interface MapKind3<A, B, C> {}
```

**Assessment: Acceptable.** `@ts-expect-error` is fundamentally different from `@ts-ignore`:
- `@ts-ignore` silently swallows any error (dangerous — suppression can become stale)
- `@ts-expect-error` requires an error to exist and will itself error if the suppressed line stops erroring (safe — prevents stale suppressions)

The CLAUDE.md rule prohibits `ts-ignore`, not `ts-expect-error`. The spirit of the rule is to prevent silently swallowing type errors — `@ts-expect-error` achieves the opposite by being explicit and self-documenting.

`MapKind3` cannot be removed — it is used by 9 type class definitions (Functor3, Chain3, Apply3, Pointed3, Monad3, Applicative3, Foldable3, Semigroup3, Traversable3). The empty interface needs type parameters for the HKT module augmentation pattern. The `@ts-expect-error` is structurally necessary.

### 1.3 Foundry Has No Imports from plgg-kit — PASS

- Zero `import ... from "plgg-kit"` in any Foundry source file
- `plgg-foundry/package.json` dependencies: only `"plgg": "file:../plgg"` (plgg-kit removed)
- `plgg-foundry/package-lock.json` updated accordingly (plgg-kit link removed)

### 1.4 `GenerateAlignmentFn` Type — PASS

Defined in `Foundry.ts:28-32`:
```typescript
export type GenerateAlignmentFn = (args: {
  systemPrompt: string;
  userPrompt: string;
  schema: Datum;
}) => PromisedResult<unknown, Error>;
```

- Uses only PLGG types (`Datum`, `PromisedResult`, `string`, `Error`) — no Kit types leak into Foundry's interface
- Accessible via barrel: `import { GenerateAlignmentFn } from "plgg-foundry"`
- Used in `Foundry` type definition (`generateAlignment: GenerateAlignmentFn`)
- Used in `makeFoundry` parameter (required, not optional)
- Used in `blueprint.ts` via `foundry.generateAlignment(reqArg)`

### 1.5 `unsafe*` Functions — PASS

| Function | Location | Validates via | Throws | Export path |
|----------|----------|--------------|--------|-------------|
| `unsafeStr` | `Str.ts:72-77` | `qualify()` | `InvalidError` | `import { unsafeStr } from "plgg"` |
| `unsafeKebabCase` | `KebabCase.ts:87-95` | `qualify()` | `InvalidError` | `import { unsafeKebabCase } from "plgg"` |
| `unsafeBool` | `Bool.ts:73-74` | Type system | N/A (identity) | `import { unsafeBool } from "plgg"` |

**Design note**: `unsafeBool` is an identity function (`(value: boolean): Bool => value`) because `Bool = true | false = boolean`. The TypeScript type system already guarantees validity at the call site. The function exists for naming consistency with the other `unsafe*` functions and for symmetry in Foundry code (`unsafeBool(spec.optional)` instead of a raw pass-through).

**Implementation note**: `unsafeStr` and `unsafeKebabCase` use `qualify()` directly rather than the design-v2's pattern of `asStr(value) → isOk → unwrap`. This is a micro-optimization that avoids `Result` allocation. The validation logic is identical — `as*` functions also use `qualify()` internally. **Acceptable.**

Barrel re-export works via `export *` in index files — no explicit index changes needed.

### 1.6 `formatEntries` Extraction — PASS

- **Single definition**: `Apparatus.ts:28-36`
- **Consumers**: Processor.ts (imports from `plgg-foundry/index`), Switcher.ts (imports from `plgg-foundry/index`), Packer.ts (imports from `plgg-foundry/index`)
- **Zero local duplicates remain**
- **Note**: The original model identified 2 duplicates (Processor, Switcher). A third duplicate in Packer.ts was discovered during implementation and also extracted. Good.

### 1.7 Additional Scope Items — PASS

| Item | Status |
|------|--------|
| G7: `@ts-ignore` in Kind.ts | Replaced with `@ts-expect-error` (acceptable) |
| G8: `asProvider` in Provider.ts | Implemented as explicit `isOk` chain |
| G9: JSON handling duplication | Correctly deferred (not addressed) |
| G10: Stray `TodoFoundry.ts` | Deleted |

### 1.8 Test Updates — PASS

- `Foundry.spec.ts`: Updated to pass `generateAlignment: async () => ok({})` to `makeFoundry`
- Example files (`ProfileFoundry.ts`, `TodoFoundry.ts`): Updated with placeholder `generateAlignment`
- No test files removed or substantially altered

---

## 2. Architectural Coherence

### 2.1 Dependency Graph — CORRECT

```
Layer 0: plgg (Foundation)
  └── Zero external deps, exports unsafe* constructors

Layer 1a: plgg-kit
  └── Depends only on plgg
  └── Exports asGenerateAlignmentFn adapter, asProvider, generateObject

Layer 1b: plgg-foundry
  └── Depends only on plgg (Kit dependency REMOVED)
  └── Exports GenerateAlignmentFn type, makeFoundry, blueprint, operate

User composition:
  └── Imports from plgg, plgg-kit, plgg-foundry independently
```

Kit and Foundry are now **peer layers** — neither depends on the other. This matches the target architecture in model-v2.md Section 5.1.

### 2.2 Type Boundary Integrity — CORRECT

- `GenerateAlignmentFn` uses only PLGG types — no Kit types in Foundry's public API
- `RegisterEntry` is Foundry-internal — doesn't leak into PLGG foundation
- `unsafe*` are PLGG-internal additions — no Foundry types in PLGG
- Kit's `asGenerateAlignmentFn` adapter creates the bridge at the user composition layer

### 2.3 Model Validation

Target metrics from model-v2.md Section 9:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| plgg-foundry imports from plgg-kit (source files) | 0 | 0 | PASS |
| `as` violations in Foundry/Kit source | 0 | 0 | PASS |
| `@ts-ignore` in source | 0 | 0 | PASS |
| `@ts-expect-error` in source | — | 1 (Kind.ts) | Acceptable |
| Stray files outside src/ | 0 | 0 | PASS |

---

## 3. Issues to Address

### Issue 1: Import Ordering in `generateObject.ts` (SHOULD FIX)

**File**: `src/plgg-kit/src/LLMs/usecase/generateObject.ts`

The `asGenerateAlignmentFn` function (lines 23-39) is placed between two import blocks. Lines 40-42 have `import` statements after the function definition:

```typescript
// lines 1-16: imports
// lines 23-39: asGenerateAlignmentFn function definition
import { reqObjectGPT } from "plgg-kit/LLMs/vendor/OpenAI";     // line 40
import { reqObjectClaude } from "plgg-kit/LLMs/vendor/Anthropic"; // line 41
import { reqObjectGemini } from "plgg-kit/LLMs/vendor/Google";   // line 42
```

While technically valid (ES module imports are hoisted), this violates standard TypeScript code organization. All imports should be at the top of the file, before any function definitions.

**Fix**: Move lines 40-42 to join the other imports at the top (after line 16).

### Issue 2: Stale JSDoc in `Foundry.ts` (SHOULD FIX)

**File**: `src/plgg-foundry/src/Foundry/model/Foundry.ts:64-67`

```typescript
/**
 * Creates a new Foundry with the given apparatuses.
 * Provider defaults to openai("gpt-5.1") if not specified.
 * maxOperationLimit defaults to 10 if not specified.
 */
```

The second line references Provider and openai(), which no longer exist. The `generateAlignment` parameter is now required, not defaulted.

**Fix**: Update to:
```typescript
/**
 * Creates a new Foundry with the given apparatuses.
 * maxOperationLimit defaults to 10 if not specified.
 */
```

---

## 4. Observations (Non-Blocking)

### 4.1 Pre-existing `as` Casts in PLGG Foundation

The model-v2 claimed "plgg `as` violations (source): 0" but the foundation contains at least 8 `as` casts in non-test source files:
- `tryCatch.ts:32,36,44,48` — `as unknown as E`, `as U`
- `atProp.ts:29` — `as Record<string, unknown>`
- `Pattern.ts:35` — `as Pattern<T, TAG>`
- `RawObj.ts:192` — `as Kind1<F, A>`
- `Dict.ts:53` — `as Record<string, unknown>`
- `ObjLike.ts:55,103` — `as A` (with `// FIXME` comments)

These were intentionally excluded from scope (consensus focused on Foundry), but the model's metric was inaccurate. Future work should either address or document these as accepted exceptions.

### 4.2 Adapter Naming Convention

The Kit adapter is named `asGenerateAlignmentFn`. In PLGG convention, `as*` means "safe cast returning Result". This function doesn't return a Result — it returns a function. The model-v2 used `createGenerateAlignment` while design-v2 used `asGenerateAlignmentFn`. This naming inconsistency is minor and doesn't affect functionality.

---

## 5. Summary

| Category | Result |
|----------|--------|
| `as` cast elimination (Foundry) | PASS — all 11 violations resolved |
| `@ts-ignore` elimination | PASS — replaced with acceptable `@ts-expect-error` |
| Foundry-Kit decoupling | PASS — zero Kit imports, dependency removed |
| `GenerateAlignmentFn` abstraction | PASS — uses only PLGG types |
| `unsafe*` factory functions | PASS — correct pattern, exported via barrel |
| `formatEntries` deduplication | PASS — single source, three consumers |
| `RegisterEntry`/`Env` typing | PASS — V9-V11 resolved structurally |
| G7/G8/G10 scope items | PASS — all addressed |
| G9 deferred | PASS — correctly not addressed |
| Tests updated | PASS — spec files and examples adapted |
| Code quality | 2 minor issues (import ordering, stale comment) |
| Architectural coherence | PASS — matches model-v2 target architecture |
