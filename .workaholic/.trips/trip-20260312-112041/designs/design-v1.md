# Design v1: Technical Implementation Plan for PLGG Library Layering Refactoring

**Author**: Constructor
**Version**: v1
**Date**: 2026-03-12

## 1. Executive Summary

The PLGG codebase consists of three packages with a clear dependency hierarchy:

```
plgg (foundation) <-- plgg-kit (vendor integrations) <-- plgg-foundry (AI pipeline orchestration)
```

The foundation library (`plgg`) is well-designed as pure TypeScript with no external dependencies and a strict type system. However, Foundry and (to a lesser extent) Kit bypass PLGG's type-safe construction patterns, using `as` casts to create PLGG types instead of using the proper `as*` casting functions provided by the foundation. This design document specifies the concrete changes needed to eliminate these violations and improve layering.

## 2. Current State Analysis

### 2.1 PLGG Foundation (`src/plgg/`)

**11 modules**, zero external dependencies, strict tsconfig. Key patterns:

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| Abstracts | Higher-kinded type system (Functor, Monad, etc.) | Type class interfaces |
| Atomics | Primitive wrappers (BigInt, Bin, Bool, Num, etc.) | Type guards + `as*` casters |
| Basics | String/numeric types (Str, KebabCase, I8-I128, etc.) | Type guards + `as*` casters |
| Collectives | Collection types (Vec, MutVec, VecLike) | Collection utilities |
| Conjunctives | Object types (Dict, Obj, RawObj) | Object utilities |
| Contextuals | Box, Icon, Ok, Err, Some, None, Pattern | Core algebraic types |
| Disjunctives | Result, Option, Datum, JsonReady | Union types |
| Exceptionals | Error types (PlggError, InvalidError, etc.) | Error hierarchy |
| Flowables | pipe, flow, cast, proc, match | Pipeline composition |
| Functionals | Utility functions (bind, conclude, find, etc.) | Function combinators |
| Grammaticals | Brand, Function, Procedural, PromisedResult | Type-level utilities |

**Type construction pattern**: Every PLGG type follows the `Box<TAG, CONTENT>` pattern. Each type provides:
- `is*`: Type guard (e.g., `isStr`)
- `as*`: Safe caster returning `Result<T, InvalidError>` (e.g., `asStr`)
- These ensure validation before construction (e.g., `asStr` verifies non-empty string, `asKebabCase` verifies kebab-case format)

**Performance-sensitive areas** (must stay pure TypeScript):
- `pipe`, `flow`, `cast`, `proc`, `match` - core pipeline functions used in every operation
- All type overloads (up to 21 for pipe/flow) - TypeScript compiler performance
- `Box`/`Ok`/`Err`/`Some`/`None` constructors - called on every datum

### 2.2 PLGG Kit (`src/plgg-kit/`)

**1 module (LLMs)**, depends on `plgg`. Reasonably well-layered:
- `Provider` type uses `Box<"OpenAI" | "Anthropic" | "Google", Config>` pattern correctly
- Uses `pattern()`, `box()`, `match()`, `proc()`, `cast()` from PLGG properly
- Vendor implementations (`OpenAI.ts`, `Anthropic.ts`, `Google.ts`) use `proc` + `postJson` pipeline pattern
- **No `as` cast violations found** in Kit

### 2.3 PLGG Foundry (`src/plgg-foundry/`)

**2 modules (Alignment, Foundry)**, depends on both `plgg` and `plgg-kit`. Multiple layering violations:

#### Violation Category 1: `as` Type Assertions (CRITICAL - violates CLAUDE.md)

| File | Line | Violation | Root Cause |
|------|------|-----------|------------|
| `Foundry/model/Foundry.ts:68` | `box("Str")(spec.description) as Str` | Bypasses `asStr` validation | No unwrapped string->Str helper |
| `Foundry/model/Processor.ts:72` | `box("KebabCase")(spec.name) as KebabCase` | Bypasses `asKebabCase` validation | No unwrapped string->KebabCase helper |
| `Foundry/model/Processor.ts:73` | `box("Str")(spec.description) as Str` | Same as above | Same |
| `Foundry/model/Switcher.ts:93` | `box("KebabCase")(spec.name) as KebabCase` | Same as above | Same |
| `Foundry/model/Switcher.ts:94` | `box("Str")(spec.description) as Str` | Same as above | Same |
| `Foundry/model/VirtualType.ts:37` | `box("Str")(spec.type) as Str` | Same as above | Same |
| `Foundry/model/VirtualType.ts:39` | `some(spec.optional as Bool)` | Bypasses `asBool` validation | No boolean->Bool helper |
| `Foundry/model/VirtualType.ts:42` | `box("Str")(spec.description) as Str` | Same as above | Same |

#### Violation Category 2: Structural `as` Assertions

| File | Line | Violation | Root Cause |
|------|------|-----------|------------|
| `Foundry/usecase/operate.ts:247` | `(param as { value: unknown }).value` | Unsafe structural cast | `Param` is typed as `unknown` |
| `Foundry/usecase/operate.ts:367` | `(param as { value: unknown }).value` | Same | Same |
| `Foundry/usecase/operate.ts:472` | `(loaded[1] as { value: unknown }).value` | Same | Same |

#### Observation: Duplicated `formatEntries` function
Both `Processor.ts:86-95` and `Switcher.ts:110-119` define identical `formatEntries` helper functions.

### 2.4 Dependency Graph Anomaly

`plgg-foundry` depends on `plgg-kit` solely for the `Provider` type and `openai()` default in `Foundry.ts`. This creates an arguably unnecessary coupling between the orchestration layer and the vendor integration layer.

## 3. Refactoring Plan

### Phase 1: Eliminate `as` Casts in Foundation Types (PLGG)

**Goal**: Provide safe factory functions that return unwrapped PLGG types, not `Result`.

**Problem**: The `as*` functions (e.g., `asStr`) return `Result<Str, InvalidError>`. When Foundry code **knows** the input is valid (e.g., a string literal for a description), it currently uses `box("Str")(...) as Str` to avoid unwrapping the Result. This is both unsafe (bypasses validation) and violates the `as` cast prohibition.

**Solution**: Add `make*` factory functions to PLGG Basics/Atomics that:
1. Validate the input
2. Throw `InvalidError` on failure (since the caller asserts validity)
3. Return the unwrapped type directly

Files to modify in `src/plgg/src/Basics/`:

```typescript
// In Str.ts - add:
export const makeStr = (value: string): Str => {
  const result = asStr(value);
  if (isOk(result)) return result.content;
  throw new InvalidError({ message: "Cannot make Str from empty string" });
};

// In KebabCase.ts - add:
export const makeKebabCase = (value: string): KebabCase => {
  const result = asKebabCase(value);
  if (isOk(result)) return result.content;
  throw new InvalidError({ message: `Cannot make KebabCase from "${value}"` });
};
```

Similarly for: `CamelCase`, `PascalCase`, `CapitalCase`, `SnakeCase`, `Alphabet`, `Alphanumeric`, `Float`, and in Atomics: `Bool`, `Num`, `BigInt`, `Bin`, `SoftStr`, `Time`.

**Affected files**: ~16 type files in Basics + ~7 in Atomics
**Risk**: LOW - additive change, no existing code breaks
**Testing**: Add spec for each `make*` function

### Phase 2: Fix `Param` Type Definition (Foundry)

**Goal**: Give `Param` a proper type so `operate.ts` doesn't need structural `as` casts.

Current (`Foundry/model/Param.ts`):
```typescript
export type Param = unknown;
```

The `Env` type stores values as `{ type?: VirtualType, value: unknown }` but `Param` is typed as `unknown`, forcing operate.ts to use `(param as { value: unknown }).value`.

**Solution**: Define `Param` properly:

```typescript
export type Param = Readonly<{
  value: unknown;
  type?: VirtualType;
}> | unknown;
```

Actually, looking at usage more carefully, the env stores `{ type, value }` objects but processors/switchers receive plain values (after JSON parsing). The issue is that `Env` uses `Param` for storage but the storage format is `{ type, value }`. We need to distinguish:

```typescript
// Storage format in Env registers
export type RegisterEntry = Readonly<{
  value: unknown;
  type?: VirtualType;
}>;

// Value passed to processors/switchers (after extraction)
export type Param = unknown;

// Updated Env type
export type Env = Dict<Address, RegisterEntry>;
```

Then in `operate.ts`, replace `(param as { value: unknown }).value` with `param.value` since param is now typed as `RegisterEntry`.

**Affected files**: `Param.ts`, `Env.ts`, `OperationContext.ts`, `operate.ts`
**Risk**: MEDIUM - changes internal data flow types, must verify all consumers
**Testing**: Existing tests in `operate.spec.ts` must pass

### Phase 3: Replace `as` Casts in Foundry with `make*` Functions

**Goal**: Replace all `as` type assertions in Foundry with the `make*` functions from Phase 1.

| File | Before | After |
|------|--------|-------|
| `Foundry.ts:68` | `box("Str")(spec.description) as Str` | `makeStr(spec.description)` |
| `Processor.ts:72` | `box("KebabCase")(spec.name) as KebabCase` | `makeKebabCase(spec.name)` |
| `Processor.ts:73` | `box("Str")(spec.description) as Str` | `makeStr(spec.description)` |
| `Switcher.ts:93` | `box("KebabCase")(spec.name) as KebabCase` | `makeKebabCase(spec.name)` |
| `Switcher.ts:94` | `box("Str")(spec.description) as Str` | `makeStr(spec.description)` |
| `VirtualType.ts:37` | `box("Str")(spec.type) as Str` | `makeStr(spec.type)` |
| `VirtualType.ts:39` | `some(spec.optional as Bool)` | `some(makeBool(spec.optional))` |
| `VirtualType.ts:42` | `box("Str")(spec.description) as Str` | `makeStr(spec.description)` |

**Affected files**: 4 files in Foundry/model
**Risk**: LOW - direct replacement with validated equivalent
**Testing**: All existing Foundry tests must pass

### Phase 4: Extract Shared `formatEntries` (Foundry)

**Goal**: Eliminate duplicated `formatEntries` function.

Move the shared helper to a common location within Foundry:

```typescript
// In Foundry/model/Apparatus.ts (or a new shared file)
export const formatEntries = (
  entries: ReadonlyArray<[string, VirtualType]>,
): string =>
  "\n" +
  entries
    .map(([name, vt]) => `  - ${formatVirtualType(name, vt)}`)
    .join("\n");
```

Then import it in both `Processor.ts` and `Switcher.ts`.

**Affected files**: `Apparatus.ts`, `Processor.ts`, `Switcher.ts`
**Risk**: LOW - pure extraction refactoring
**Testing**: Existing tests cover this behavior

### Phase 5: Evaluate Foundry-Kit Dependency (DEFERRED)

The `plgg-foundry` -> `plgg-kit` dependency exists because:
1. `Foundry` type has a `provider: Provider` field
2. `makeFoundry` defaults to `openai("gpt-5.1")`
3. `blueprint.ts` calls `generateObject` from plgg-kit

This coupling is architecturally intentional - Foundry IS an AI pipeline orchestrator that needs LLM providers. **Do not decouple in this iteration.** The dependency is legitimate and well-bounded.

## 4. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| `make*` functions throw instead of returning Result | LOW | These are only for cases where the caller asserts validity; document the throwing behavior clearly |
| Param type restructuring breaks operate.ts logic | MEDIUM | Run full test suite after each change; the operate.spec.ts and runFoundry.spec.ts cover the execution path |
| Foundry `as` removal changes runtime behavior | LOW | The `make*` functions perform the same validation as `as*` but unwrap the Result; behavior is identical for valid inputs |
| Performance regression from additional validation | NEGLIGIBLE | `make*` calls happen during setup/construction, not in hot paths; pipe/flow/proc remain untouched |

## 5. Testing Strategy

### 5.1 PLGG Foundation Tests
- Add unit tests for each new `make*` function:
  - Valid input returns correct typed value
  - Invalid input throws InvalidError
- Run `sh/tsc-plgg.sh` after Phase 1 to verify no type errors
- Run `sh/test-plgg.sh` to verify all existing tests pass plus new ones

### 5.2 PLGG Foundry Tests
- After Phase 2-4, run `sh/tsc-plgg-foundry.sh` to verify no type errors
- Run `sh/test-plgg-foundry.sh` to verify all existing tests pass
- Key test files: `Foundry.spec.ts`, `operate.spec.ts`, `blueprint.spec.ts`, `runFoundry.spec.ts`

### 5.3 PLGG Kit Tests
- Run `sh/tsc-plgg-kit.sh` and `sh/test-plgg-kit.sh` (Kit has no violations, but verify no regressions)

### 5.4 End-to-End
- Run `sh/check-all.sh` to verify full system coherence

## 6. Migration Order

```
Phase 1 (PLGG)    ──> Phase 2 (Foundry Param) ──> Phase 3 (Foundry as casts) ──> Phase 4 (Foundry dedup)
  Add make* fns        Fix Param/Env types         Replace as casts              Extract formatEntries
  ~23 files             4 files                     4 files                       3 files
  Risk: LOW             Risk: MEDIUM                Risk: LOW                     Risk: LOW
```

Each phase is independently compilable and testable. Phase 3 depends on Phase 1 (needs `make*` functions). Phases 2 and 4 are independent of each other but should follow Phase 1.

## 7. Files Not Changed

The following are explicitly **not** modified:

- **PLGG Flowables** (`pipe.ts`, `flow.ts`, `cast.ts`, `proc.ts`, `match.ts`): Performance-critical, heavily overloaded, no issues found
- **PLGG Abstracts**: Type-class infrastructure, no issues found
- **PLGG Kit**: Already well-layered on PLGG foundations, no violations
- **PLGG Grammaticals**: Type-level utilities, no issues found
- **Build/config files**: tsconfig.json, vite.config.ts, package.json - no changes needed

## 8. Success Criteria

1. Zero `as` type assertions in the codebase (grep for ` as ` in .ts files, excluding comments and spec files)
2. `sh/check-all.sh` passes with zero errors
3. `Param` type is properly structured, no structural `as` casts in `operate.ts`
4. No duplicated helper functions across Foundry model files
5. All existing tests continue to pass
6. No new external dependencies introduced
