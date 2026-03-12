# Review Preparation: Architectural Review of Implementation

**Author**: Architect
**Date**: 2026-03-12
**Task**: #10 — Architectural review of Constructor's implementation
**Status**: Baseline captured, review checklist prepared

---

## 1. Baseline State (main branch, commit 06d1250)

### 1.1 Violation Inventory (Pre-Refactoring)

| ID | File | Violation | Phase |
|----|------|-----------|-------|
| V1 | `Foundry.ts:68` | `box("Str")(spec.description) as Str` | 3 |
| V2 | `Processor.ts:72` | `box("KebabCase")(spec.name) as KebabCase` | 3 |
| V3 | `Processor.ts:73` | `box("Str")(spec.description) as Str` | 3 |
| V4 | `Switcher.ts:93` | `box("KebabCase")(spec.name) as KebabCase` | 3 |
| V5 | `Switcher.ts:94` | `box("Str")(spec.description) as Str` | 3 |
| V6 | `VirtualType.ts:37` | `box("Str")(spec.type) as Str` | 3 |
| V7 | `VirtualType.ts:39` | `some(spec.optional as Bool)` | 3 |
| V8 | `VirtualType.ts:42` | `box("Str")(spec.description) as Str` | 3 |
| V9 | `operate.ts:247` | `(param as { value: unknown }).value` | 2 |
| V10 | `operate.ts:367` | `(param as { value: unknown }).value` | 2 |
| V11 | `operate.ts:472` | `(loaded[1] as { value: unknown }).value` | 2 |
| V12 | `Foundry.ts:9` | `import { Provider, openai } from "plgg-kit"` | 4 |
| V13 | `blueprint.ts:13` | `import { generateObject } from "plgg-kit"` | 4 |
| G7 | `Kind.ts:16` | `// @ts-ignore will have ReaderTaskResult` | 6 |
| G8 | `Provider.ts:24-30` | `asProvider` commented out | 4 |
| G10 | `plgg-kit/TodoFoundry.ts` | Stray file outside src/ | 5 |

### 1.2 Baseline Type Definitions

**Param.ts (baseline)**:
```typescript
export type Param = unknown;
// No RegisterEntry type
```

**Env.ts (baseline)**:
```typescript
export type Env = Readonly<Record<Address, Param>>;
```

**Foundry type (baseline)**:
```typescript
export type Foundry = Readonly<{
  provider: Provider;          // from plgg-kit — lateral dependency
  description: Str;
  maxOperationLimit: number;
  apparatuses: ReadonlyArray<Apparatus>;
  beforeOperations?: BeforeOperations;
  afterOperations?: AfterOperations;
}>;
```

### 1.3 Barrel Export Structure

Barrel exports use `export *` pattern:
- `src/plgg/src/Basics/index.ts` → `export * from "plgg/Basics/Str"` (auto-exports unsafeStr)
- `src/plgg/src/Basics/index.ts` → `export * from "plgg/Basics/KebabCase"` (auto-exports unsafeKebabCase)
- `src/plgg/src/Atomics/index.ts` → `export * from "plgg/Atomics/Bool"` (auto-exports unsafeBool)

No barrel changes needed — `export *` picks up new named exports automatically.

### 1.4 Structural Observations

- `formatEntries` is duplicated identically in `Processor.ts` (lines 88-97) and `Switcher.ts` (lines 112-121)
- `Apparatus.ts` is a pure union type + dispatcher — good candidate for shared `formatEntries`
- `blueprint.ts` calls `generateObject` directly with `foundry.provider` — must change to `foundry.generateAlignment`
- `operate.ts`'s `loadValueFromEnv` returns `Result<[Address, Param], Error>` — must become `Result<[Address, RegisterEntry], Error>`

---

## 2. Review Checklist (Against model-v2.md and design-v2.md)

### 2.1 Phase 1: PLGG Foundation (`unsafe*` constructors)

- [ ] `unsafeStr` exists in `Str.ts`, uses `qualify()` guard, throws `InvalidError`
- [ ] `unsafeKebabCase` exists in `KebabCase.ts`, uses `qualify()` guard, throws `InvalidError`
- [ ] `unsafeBool` exists in `Bool.ts`, validates boolean type, throws `InvalidError`
- [ ] All three are accessible via `import { unsafeStr, unsafeKebabCase, unsafeBool } from "plgg"`
- [ ] No `as` assertions used in the `unsafe*` implementations themselves

### 2.2 Phase 2: RegisterEntry / Env Typing

- [ ] `RegisterEntry` type defined in `Param.ts` with `{ value: unknown; type?: VirtualType }`
- [ ] `Param` type preserved for downstream compatibility
- [ ] `Env` type updated to `Record<Address, RegisterEntry>` (not `Record<Address, Param>`)
- [ ] `operate.ts` no longer has any `as { value: unknown }` casts (V9-V11 resolved)
- [ ] `loadValueFromEnv` return type updated to use `RegisterEntry`
- [ ] All env reads use `entry.value` / `entry.type` instead of casting

### 2.3 Phase 3: Foundry `as` Cast Elimination

- [ ] V1: `Foundry.ts` — `unsafeStr(spec.description)` replaces `box("Str")(...) as Str`
- [ ] V2: `Processor.ts` — `unsafeKebabCase(spec.name)` replaces `box("KebabCase")(...) as KebabCase`
- [ ] V3: `Processor.ts` — `unsafeStr(spec.description)` replaces `box("Str")(...) as Str`
- [ ] V4: `Switcher.ts` — `unsafeKebabCase(spec.name)` replaces `box("KebabCase")(...) as KebabCase`
- [ ] V5: `Switcher.ts` — `unsafeStr(spec.description)` replaces `box("Str")(...) as Str`
- [ ] V6: `VirtualType.ts` — `unsafeStr(spec.type)` replaces `box("Str")(...) as Str`
- [ ] V7: `VirtualType.ts` — `some(unsafeBool(spec.optional))` replaces `some(spec.optional as Bool)`
- [ ] V8: `VirtualType.ts` — `unsafeStr(spec.description)` replaces `box("Str")(...) as Str`
- [ ] No new `as` assertions introduced anywhere
- [ ] `box` import removed from files that no longer use it

### 2.4 Phase 4: Foundry-Kit Decoupling

- [ ] `GenerateAlignmentFn` type defined in Foundry using only PLGG types (`Datum`, `PromisedResult`)
- [ ] `Foundry` type has `generateAlignment: GenerateAlignmentFn` instead of `provider: Provider`
- [ ] `makeFoundry` accepts `generateAlignment` parameter (required, not optional)
- [ ] `blueprint.ts` calls `foundry.generateAlignment(...)` instead of `generateObject(provider, ...)`
- [ ] All `import ... from "plgg-kit"` removed from Foundry source files
- [ ] `plgg-foundry/package.json` no longer lists `plgg-kit` as dependency
- [ ] Kit provides adapter: `asGenerateAlignmentFn(provider)` or equivalent
- [ ] `asProvider` cast chain implemented (not commented out) in `Provider.ts`

### 2.5 Phase 5: Shared `formatEntries` + Cleanup

- [ ] `formatEntries` extracted to shared location (Apparatus.ts or similar)
- [ ] `Processor.ts` imports shared `formatEntries` instead of defining local copy
- [ ] `Switcher.ts` imports shared `formatEntries` instead of defining local copy
- [ ] `plgg-kit/TodoFoundry.ts` removed (stray file G10)

### 2.6 Phase 6: Kind.ts G7

- [ ] `@ts-ignore` removed from `Kind.ts` line 16
- [ ] `MapKind3<A, B, C>` interface retained (empty, valid TypeScript)
- [ ] No new `@ts-ignore` introduced anywhere

### 2.7 Cross-Cutting Checks

- [ ] Zero `as` type assertions in source files (excluding re-exports, namespace imports, test files)
- [ ] Zero `@ts-ignore` in source files
- [ ] Zero `import ... from "plgg-kit"` in Foundry source files
- [ ] No `any` type annotations introduced
- [ ] Existing test files not modified (or modifications are structurally necessary)
- [ ] Example files updated if Foundry API changed

### 2.8 Architectural Coherence

- [ ] Dependency graph: `plgg` ← `plgg-kit`, `plgg` ← `plgg-foundry` (no lateral Foundry↔Kit)
- [ ] `GenerateAlignmentFn` uses only PLGG types — no Kit types leak into Foundry's interface
- [ ] `RegisterEntry` is a Foundry-internal type — doesn't leak into PLGG foundation
- [ ] `unsafe*` naming convention is consistent (all three follow same pattern)
- [ ] `unsafe*` implementations use existing `qualify()` or `as*()` — no bypass of validation logic

### 2.9 Model Validation

- [ ] All 13 violations (V1-V13) in model-v2.md Section 4.4 are resolved
- [ ] G7, G8, G10 are resolved (Section 6 scope items)
- [ ] G9 is NOT addressed (correctly deferred per consensus)
- [ ] Target metrics in model-v2.md Section 9 are met:
  - plgg-foundry imports from plgg-kit: **0 files** (was 2)
  - `as` violations (source): **0** (was 11)
  - `@ts-ignore`: **0** (was 1)

---

## 3. Known Early Observations (Phase 1 Commit 77f565b)

Phase 1 has been committed. Early observations from reading the code:

1. **`unsafeBool` implementation is simpler than peers**: It returns `value` directly (since `boolean` type already guarantees validity via TypeScript's type system). This is correct — `Bool = typeof TRUE | typeof FALSE = true | false = boolean`. No runtime validation needed; the function signature `(value: boolean): Bool` already constrains input. The `unsafe` prefix is slightly misleading here since it can never throw, but naming consistency is more valuable than per-function accuracy.

2. **`unsafeStr` and `unsafeKebabCase` use `qualify()` directly** rather than delegating to `asStr`/`asKebabCase` + unwrap. This is a micro-optimization (avoids Result allocation) but subtly diverges from design-v2.md which shows `const result = asStr(value); if (isOk(result)) return result.content; throw ...`. The divergence is acceptable — `qualify()` is the same validation logic, and the `as*` functions also use `qualify()` internally.

3. **Barrel exports are fine**: `export *` from module index files automatically picks up new named exports. No index file changes needed.
