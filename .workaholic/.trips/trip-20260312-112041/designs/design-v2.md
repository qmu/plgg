# Design v2: Technical Implementation Plan for PLGG Library Layering Refactoring

**Author**: Constructor
**Version**: v2
**Date**: 2026-03-12
**Supersedes**: design-v1.md
**Changes from v1**: Narrowed Phase 1 scope (3 types, `unsafe*` naming), added Foundry-Kit decoupling phase, added G7/G8/G10 cleanup, deferred G9.

## 1. Executive Summary

The PLGG codebase consists of three packages:

```
plgg (foundation) <-- plgg-kit (vendor integrations) <-- plgg-foundry (AI pipeline orchestration)
```

This refactoring eliminates all `as` cast / `@ts-ignore` violations, improves internal type definitions, decouples Foundry from Kit, and cleans up stray artifacts. The work is organized in 6 phases, each independently compilable and testable.

## 2. Current State Analysis

(Unchanged from v1 — see design-v1.md sections 2.1-2.4 for full details.)

**Summary of violations**:
- 8 `as` type assertions in Foundry model files (Foundry.ts, Processor.ts, Switcher.ts, VirtualType.ts)
- 3 structural `as { value: unknown }` casts in operate.ts
- 1 `@ts-ignore` in Kind.ts (MapKind3)
- 1 stray file: `plgg-kit/TodoFoundry.ts` outside src/
- 1 commented-out `asProvider` in Provider.ts
- Duplicated `formatEntries` in Processor.ts and Switcher.ts
- Foundry depends on Kit (should be decoupled)

## 3. Refactoring Plan

### Phase 1: Add `unsafe*` Factory Functions to PLGG Foundation

**Goal**: Provide throwing factory functions for the 3 PLGG types that Foundry needs to construct from plain values.

**Problem**: The `as*` functions (e.g., `asStr`) return `Result<Str, InvalidError>`. When Foundry code **knows** the input is valid (e.g., a string literal for a description), it currently uses `box("Str")(...) as Str` to avoid unwrapping the Result. This bypasses validation and violates the `as` cast prohibition.

**Solution**: Add `unsafe*` factory functions that validate and return the unwrapped type, throwing on invalid input. The `unsafe` prefix signals that these throw rather than returning Result — callers must be confident the input is valid.

**Scope**: Only 3 types — exactly those used in Foundry's `as` violations:

```typescript
// In src/plgg/src/Basics/Str.ts — add:
export const unsafeStr = (value: string): Str => {
  const result = asStr(value);
  if (isOk(result)) return result.content;
  throw new InvalidError({ message: "Cannot create Str from empty string" });
};

// In src/plgg/src/Basics/KebabCase.ts — add:
export const unsafeKebabCase = (value: string): KebabCase => {
  const result = asKebabCase(value);
  if (isOk(result)) return result.content;
  throw new InvalidError({ message: `Cannot create KebabCase from "${value}"` });
};

// In src/plgg/src/Atomics/Bool.ts — add:
export const unsafeBool = (value: boolean): Bool => {
  const result = asBool(value);
  if (isOk(result)) return result.content;
  throw new InvalidError({ message: "Cannot create Bool from non-boolean value" });
};
```

Also update barrel exports:
- `src/plgg/src/Basics/index.ts` — add re-exports for `unsafeStr`, `unsafeKebabCase`
- `src/plgg/src/Atomics/index.ts` — add re-export for `unsafeBool`

**Affected files**: 5 files (Str.ts, KebabCase.ts, Bool.ts, Basics/index.ts, Atomics/index.ts)
**Risk**: LOW — additive change, no existing code breaks
**Testing**: Add spec for each `unsafe*` function (valid input returns typed value, invalid input throws)

### Phase 2: Fix `Param`/`Env` Type Definitions (Foundry)

**Goal**: Give `Param` a proper type so `operate.ts` doesn't need structural `as` casts.

**Current state**:
```typescript
// Param.ts
export type Param = unknown;

// Env.ts
export type Env = Readonly<Record<Address, Param>>;
```

The env actually stores `{ type?: VirtualType, value: unknown }` objects, but `Param = unknown` forces operate.ts to use `(param as { value: unknown }).value`.

**Solution**: Introduce `RegisterEntry` and update `Env`:

```typescript
// Param.ts — add:
export type RegisterEntry = Readonly<{
  value: unknown;
  type?: VirtualType;
}>;

// Env.ts — change:
export type Env = Readonly<Record<Address, RegisterEntry>>;
```

Then in `operate.ts`, replace all 3 occurrences of `(param as { value: unknown }).value` with `param.value` since param is now typed as `RegisterEntry`.

**Affected files**: `Param.ts`, `Env.ts`, `operate.ts`
**Risk**: MEDIUM — changes internal data flow types, must verify all consumers
**Testing**: Existing tests in `operate.spec.ts` and `runFoundry.spec.ts` must pass

### Phase 3: Replace `as` Casts in Foundry with `unsafe*` Functions

**Goal**: Replace all 8 `as` type assertions in Foundry model files.

| File | Before | After |
|------|--------|-------|
| `Foundry.ts:68` | `box("Str")(spec.description) as Str` | `unsafeStr(spec.description)` |
| `Processor.ts:72` | `box("KebabCase")(spec.name) as KebabCase` | `unsafeKebabCase(spec.name)` |
| `Processor.ts:73` | `box("Str")(spec.description) as Str` | `unsafeStr(spec.description)` |
| `Switcher.ts:93` | `box("KebabCase")(spec.name) as KebabCase` | `unsafeKebabCase(spec.name)` |
| `Switcher.ts:94` | `box("Str")(spec.description) as Str` | `unsafeStr(spec.description)` |
| `VirtualType.ts:37` | `box("Str")(spec.type) as Str` | `unsafeStr(spec.type)` |
| `VirtualType.ts:39` | `some(spec.optional as Bool)` | `some(unsafeBool(spec.optional))` |
| `VirtualType.ts:42` | `box("Str")(spec.description) as Str` | `unsafeStr(spec.description)` |

Import changes: Replace `box` imports with `unsafeStr`/`unsafeKebabCase`/`unsafeBool` from `plgg`.

**Affected files**: 4 files (`Foundry.ts`, `Processor.ts`, `Switcher.ts`, `VirtualType.ts`)
**Risk**: LOW — direct replacement with validated equivalent
**Testing**: All existing Foundry tests must pass

### Phase 4: Decouple Foundry from Kit

**Goal**: Remove `plgg-foundry`'s dependency on `plgg-kit`. Foundry defines its own function type for alignment generation; Kit provides the concrete adapter.

**Step 4a: Define `GenerateAlignmentFn` in Foundry**

```typescript
// In Foundry/model/Foundry.ts — add:
import { Datum, PromisedResult } from "plgg";

export type GenerateAlignmentFn = (args: {
  systemPrompt: string;
  userPrompt: string;
  schema: Datum;
}) => PromisedResult<unknown, Error>;
```

**Step 4b: Replace `Provider` with `GenerateAlignmentFn` in Foundry type**

```typescript
// Foundry type — change:
export type Foundry = Readonly<{
  generateAlignment: GenerateAlignmentFn;  // was: provider: Provider
  description: Str;
  maxOperationLimit: number;
  apparatuses: ReadonlyArray<Apparatus>;
  beforeOperations?: BeforeOperations;
  afterOperations?: AfterOperations;
}>;
```

**Step 4c: Update `makeFoundry`**

Remove the `openai("gpt-5.1")` default. The `generateAlignment` function is now required:

```typescript
export const makeFoundry = (spec: {
  description: string;
  generateAlignment: GenerateAlignmentFn;
  apparatuses: ReadonlyArray<Apparatus>;
  maxOperationLimit?: number;
  beforeOperations?: BeforeOperations;
  afterOperations?: AfterOperations;
}): Foundry => ({ ... });
```

**Step 4d: Update `blueprint.ts`**

Replace `generateObject(provider, ...)` call with `foundry.generateAlignment(...)`:

```typescript
// blueprint.ts — change:
export const blueprint =
  (foundry: Foundry) =>
  async (order: Order): PromisedResult<Alignment, Error> => {
    // ... build systemPrompt, userPrompt, schema as before ...
    return proc(
      { systemPrompt, userPrompt, schema },
      foundry.generateAlignment,  // was: generateObject with provider
      asAlignment,
    );
  };
```

**Step 4e: Provide adapter in Kit**

Add a function in `plgg-kit` that bridges Kit's `generateObject` to Foundry's `GenerateAlignmentFn`:

```typescript
// In plgg-kit/src/LLMs/usecase/generateObject.ts — add:
export const asGenerateAlignmentFn =
  (provider: Provider): GenerateAlignmentFn =>
  ({ systemPrompt, userPrompt, schema }) =>
    generateObject({ provider, systemPrompt, userPrompt, schema });
```

Note: `GenerateAlignmentFn` type will be imported from `plgg-foundry` by Kit users, or Kit can define a compatible function type. Since the function signature uses only PLGG types (`Datum`, `PromisedResult`), Kit can construct a compatible function without importing Foundry.

**Step 4f: Remove Kit dependency from Foundry**

- Remove `"plgg-kit": "file:../plgg-kit"` from `plgg-foundry/package.json`
- Remove all `import ... from "plgg-kit"` in Foundry source files

**Step 4g: Implement `asProvider` in Kit (G8)**

Complete the commented-out `asProvider` cast chain in `Provider.ts`:

```typescript
export const asProvider = (v: unknown) =>
  cast(v, asOpenAI, asAnthropic, asGoogle);
```

This resolves G8 and completes Kit's layering.

**Affected files**:
- Foundry: `Foundry.ts`, `blueprint.ts`, `package.json` (remove kit dep)
- Kit: `generateObject.ts` (add adapter), `Provider.ts` (implement asProvider)
- Foundry imports: Remove all `from "plgg-kit"` imports

**Risk**: MEDIUM — changes Foundry's public API. Mitigated by Kit providing a ready-made adapter, keeping consumer migration simple:
```typescript
// Before:
makeFoundry({ description: "...", apparatuses: [...] })
// After:
import { asGenerateAlignmentFn, openai } from "plgg-kit";
makeFoundry({ description: "...", generateAlignment: asGenerateAlignmentFn(openai("gpt-5.1")), apparatuses: [...] })
```

**Testing**: All existing Foundry tests must be updated to pass the `generateAlignment` function. Kit tests unaffected.

### Phase 5: Extract Shared `formatEntries` + Cleanup (Foundry)

**Goal**: Eliminate duplicated code and stray files.

**5a: Extract `formatEntries`**

Move the duplicated helper from `Processor.ts` and `Switcher.ts` to `Apparatus.ts`:

```typescript
// In Foundry/model/Apparatus.ts — add:
export const formatEntries = (
  entries: ReadonlyArray<[string, VirtualType]>,
): string =>
  "\n" +
  entries
    .map(([name, vt]) => `  - ${formatVirtualType(name, vt)}`)
    .join("\n");
```

Remove the duplicate from both `Processor.ts` and `Switcher.ts`, import from `Apparatus.ts` instead.

**5b: Remove stray file (G10)**

Delete `src/plgg-kit/TodoFoundry.ts` — this file is outside `src/` and appears misplaced.

**Affected files**: `Apparatus.ts`, `Processor.ts`, `Switcher.ts`, `plgg-kit/TodoFoundry.ts` (delete)
**Risk**: LOW
**Testing**: Existing tests cover formatEntries behavior

### Phase 6: Fix `@ts-ignore` in Kind.ts (G7)

**Goal**: Remove the `@ts-ignore` comment from `MapKind3` in PLGG foundation.

**Current state** (`src/plgg/src/Abstracts/Principals/Kind.ts:16`):
```typescript
// @ts-ignore will have ReaderTaskResult
export interface MapKind3<A, B, C> {}
```

The empty interface with `@ts-ignore` violates CLAUDE.md rules. `ReaderTaskResult` is not implemented.

**Solution**: Remove the `@ts-ignore` comment. The empty interface is valid TypeScript — it's a registry that gets populated via module augmentation (same pattern as `MapKind1` and `MapKind2`). The `@ts-ignore` was only suppressing a lint warning about empty interfaces, not a type error.

```typescript
/**
 * Registry for mapping three-parameter type constructor keys to their concrete types.
 */
export interface MapKind3<A, B, C> {}
```

**Affected files**: 1 file (`Kind.ts`)
**Risk**: NEGLIGIBLE
**Testing**: Run `sh/tsc-plgg.sh` to verify

## 4. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| `unsafe*` functions throw instead of returning Result | LOW | `unsafe` prefix clearly signals throwing behavior; only used in setup code |
| Param/RegisterEntry restructuring breaks operate.ts | MEDIUM | Run full test suite after each change; operate.spec.ts covers execution path |
| Foundry-Kit decoupling changes public API | MEDIUM | Kit provides `asGenerateAlignmentFn` adapter; consumer migration is 1-line change |
| Foundry `as` removal changes runtime behavior | LOW | `unsafe*` functions perform same validation; behavior identical for valid inputs |
| Performance regression from validation | NEGLIGIBLE | `unsafe*` calls happen during setup, not in hot paths |

## 5. Testing Strategy

### 5.1 Phase 1 Tests (PLGG Foundation)
- Add unit tests for `unsafeStr`, `unsafeKebabCase`, `unsafeBool`:
  - Valid input returns correct typed value
  - Invalid input throws `InvalidError`
- Run `sh/tsc-plgg.sh` + `sh/test-plgg.sh`

### 5.2 Phase 2-3 Tests (Foundry Internals)
- Run `sh/tsc-plgg-foundry.sh` + `sh/test-plgg-foundry.sh`
- Key test files: `operate.spec.ts`, `Foundry.spec.ts`

### 5.3 Phase 4 Tests (Decoupling)
- Update Foundry test files to pass `generateAlignment` function
- Run `sh/tsc-plgg-foundry.sh` + `sh/test-plgg-foundry.sh`
- Run `sh/tsc-plgg-kit.sh` + `sh/test-plgg-kit.sh`

### 5.4 Phase 5-6 Tests (Cleanup)
- Run `sh/tsc-plgg.sh` + `sh/test-plgg.sh` (Kind.ts)
- Run `sh/tsc-plgg-foundry.sh` (formatEntries)

### 5.5 End-to-End
- Run `sh/check-all.sh` to verify full system coherence

## 6. Migration Order

```
Phase 1 (PLGG)     ──> Phase 2 (Foundry Param) ──> Phase 3 (Foundry as) ──> Phase 4 (Decouple) ──> Phase 5 (Cleanup) ──> Phase 6 (Kind.ts)
  3 unsafe* fns         Fix RegisterEntry/Env       Replace 8 as casts       Decouple F->K          Dedup + stray file    Remove @ts-ignore
  5 files               3 files                     4 files                  ~6 files               4 files                1 file
  Risk: LOW             Risk: MEDIUM                Risk: LOW                Risk: MEDIUM            Risk: LOW              Risk: NEGLIGIBLE
```

Dependencies: Phase 3 requires Phase 1. Phase 4 is independent of Phases 2-3 but logically follows. Phase 5-6 are independent.

## 7. Explicitly Deferred

- **G9 (JSON handling duplication)**: `toJsonString`/`parseJsonValue` in operate.ts. Deferred — these serve a specific register-machine purpose distinct from PLGG's JsonReady system. May revisit after Param typing improves.
- **Additional `unsafe*` functions**: Only 3 are needed now. More can be added when actual violations demand them.
- **Test file `as any` cleanup**: 11 occurrences across PLGG test files. Out of scope for this iteration — test files are not production code.

## 8. Success Criteria

1. Zero `as` type assertions in source files (grep for ` as ` in non-spec .ts files, excluding comments)
2. Zero `@ts-ignore` in source files
3. `sh/check-all.sh` passes with zero errors
4. `Param`/`Env` types are properly structured with `RegisterEntry`
5. `plgg-foundry/package.json` has no dependency on `plgg-kit`
6. Kit provides `asGenerateAlignmentFn` adapter and complete `asProvider` cast chain
7. No duplicated helper functions across Foundry model files
8. No stray files outside `src/` directories
9. All existing tests continue to pass (with necessary adapter wiring updates)
