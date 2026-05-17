# Model v2 — PLGG Architectural Model (Post-Consensus)

**Author**: Architect
**Version**: 2
**Date**: 2026-03-12
**Supersedes**: model-v1.md
**Status**: Consensus-approved

---

## 1. System Overview

PLGG is a monorepo containing a **three-layer library stack** for building type-safe data pipelines in pure TypeScript. The layers are:

| Layer | Package | Version | Purpose |
|-------|---------|---------|---------|
| Foundation | `plgg` | 0.0.26 | Pure TypeScript type system, data primitives, and functional combinators |
| Kit | `plgg-kit` | 0.0.1 | Vendor integrations (LLM providers) built on PLGG |
| Foundry | `plgg-foundry` | 0.0.1 | AI-driven pipeline orchestration engine |
| Example | `@plgg/example` | 0.0.2 | Usage examples |

All packages reside under `src/` in a flat monorepo with local `file:` dependencies. Each has its own `package.json`, `tsconfig.json`, and `vite.config.ts`. TypeScript is configured with maximum strictness (`strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly`).

---

## 2. PLGG Foundation Layer (`src/plgg/`)

### 2.1 Module Taxonomy

The foundation exports 11 module families via barrel re-exports:

| Module | Category | Contents |
|--------|----------|----------|
| **Abstracts/Principals** | Type classes | Kind, Functor, Apply, Applicative, Pointed, Chain, Monad, Foldable, Traversable, Semigroup, Monoid |
| **Abstracts/Servables** | Service interfaces | Castable, Refinable, JsonSerializable |
| **Atomics** | Primitive wrappers | Bool, Num, Int, BigInt, Bin, SoftStr, Time |
| **Basics** | Refined types | I8..I128, U8..U128, Float, Str, Alphabet, Alphanumeric, CamelCase, CapitalCase, KebabCase, PascalCase, SnakeCase |
| **Collectives** | Collections | Vec, MutVec, VecLike, ReadonlyArray |
| **Conjunctives** | Records | Obj, Dict, RawObj |
| **Contextuals** | Wrappers | Box, UntaggedBox, Some, None, Ok, Err, Icon, Pattern, NominalDatum, OptionalDatum |
| **Disjunctives** | Unions | Atomic, Basic, Datum, ObjLike, Option, Result, JsonReady |
| **Exceptionals** | Errors | BaseError, PlggError, InvalidError, DeserializeError, SerializeError, Exception |
| **Flowables** | Composition | pipe, proc, cast, match, flow |
| **Functionals** | Utilities | atIndex, atProp, bind, conclude, debug, defined, env, filter, find, hold, pass, postJson, refine, tap, tryCatch |
| **Grammaticals** | Type-level | BoolAlgebra, Brand, Function, NonNeverFn, Procedural, PromisedResult |

### 2.2 Core Type Hierarchy

```
Datum = DatumCore | OptionalDatum<DatumCore> | NominalDatum<string, DatumCore>
  DatumCore = Atomic | Basic | Obj | ReadonlyArray<Datum>
    Atomic = Bool | Num | Int | BigInt | Bin | SoftStr | Time
    Basic = I8..I128 | U8..U128 | Float | Str | Alphabet | Alphanumeric | CamelCase | ...
    Obj = Readonly<{ [key: string]: Datum }>
    Vec = ReadonlyArray<Datum>
```

### 2.3 Higher-Kinded Type (HKT) System

PLGG implements HKTs via TypeScript's **module augmentation pattern**:
- `MapKind1<A>`, `MapKind2<A,B>` registries in `Kind.ts`
- Types register via `declare module "plgg/Abstracts/Principals/Kind"` (e.g., Option registers in `MapKind1`, Result in `MapKind2`)
- Type classes (Functor, Monad, etc.) are parameterized by `KindKey` strings
- `MapKind3<A,B,C>` exists but is unused — to be cleaned up (see Section 6)

### 2.4 Composition Primitives

Four distinct composition strategies:
- **`pipe`**: Synchronous pure function composition (`A -> B -> C`)
- **`cast`**: Synchronous Result-chain composition (`A -> Result<B, InvalidError> -> ...`) — used for validation/parsing
- **`proc`**: Async Procedural-chain composition (`A -> Procedural<B> -> ...`) — auto-unwraps Result/Promise, catches exceptions
- **`match`**: Exhaustive pattern matching on Box/Icon/Atomic variants

### 2.5 Box Pattern

`Box<TAG, CONTENT>` is the core nominal wrapper: `{ __tag: TAG, content: CONTENT }`. Used pervasively:
- Atomics like `Str`, `KebabCase` are `Box<"Str", string>`, `Box<"KebabCase", string>`
- Extension types like `Processor`, `Switcher`, `Packer` are `Box<"Processor", {...}>`
- `Pattern` and `Icon` enable exhaustive pattern matching on tagged unions

### 2.6 Type Construction Dual API (Consensus Decision)

PLGG types follow a dual API convention:
- **`as*` functions**: Safe casters returning `Result<T, InvalidError>` — used in validation/parsing pipelines
- **`unsafe*` functions** (NEW): Asserting constructors that throw `InvalidError` on failure — used when the caller guarantees validity (e.g., constructing from string literals)

The `unsafe` prefix explicitly signals throwing behavior, distinguishing these from the Result-based `as*` API. Both co-exist; `as*` remains the primary safe path.

**Scope**: Only 3 `unsafe*` functions needed based on current violation catalog:
- `unsafeStr(value: string): Str`
- `unsafeKebabCase(value: string): KebabCase`
- `unsafeBool(value: boolean): Bool`

### 2.7 File Counts

- Source files (non-test): **107**
- Test files: **61**
- Zero external dependencies (devDependencies only)

---

## 3. PLGG Kit Layer (`src/plgg-kit/`)

### 3.1 Structure

```
plgg-kit/
  src/
    LLMs/
      model/    Provider.ts          — Provider = OpenAI | Anthropic | Google (Box types)
      usecase/  generateObject.ts    — Unified API: provider -> prompt -> schema -> Result<unknown>
      vendor/   OpenAI.ts, Anthropic.ts, Google.ts  — Raw HTTP request implementations
    index.ts    — re-exports LLMs/
  TodoFoundry.ts  — STRAY FILE (outside src/, to be removed)
```

### 3.2 Dependency Usage

- **Depends on**: `plgg` (file dependency)
- **PLGG usage**: Heavy — uses `Box`, `Obj`, `Option`, `pattern`, `cast`, `proc`, `match`, `env`, `postJson`, `jsonDecode`, `PromisedResult`, `asSoftStr`, `atProp`, `atIndex`, `unbox`, `pipe`, `ok`, `some`, `none`, `forProp`, `forOptionProp`, `forContent`, `asBox`, `asObj`, `asSoftStr`
- **Source files**: 4 non-test, 3 test
- **External deps**: `dotenv` (dev only)

### 3.3 Assessment

Kit is **well-integrated** with PLGG foundations. Provider types use Box pattern properly. The `generateObject` usecase leverages `proc` and `match` correctly. Vendor implementations use `proc` + `postJson` + prop accessors idiomatically.

### 3.4 Kit Gaps (In Scope)

- **`asProvider`**: Commented out in `Provider.ts` — should be implemented to complete the cast chain for the Provider union type
- **Foundry adapter**: Kit must provide a `createGenerateAlignment` adapter function that bridges Kit's `generateObject` to Foundry's `GenerateAlignmentFn` abstraction (see Section 5.2)

---

## 4. PLGG Foundry Layer (`src/plgg-foundry/`)

### 4.1 Structure

```
plgg-foundry/
  src/
    Alignment/
      model/    Alignment.ts, Operation.ts, Process.ts, Switch.ts, Assign.ts, Ingress.ts, Egress.ts
    Foundry/
      model/    Foundry.ts, Apparatus.ts, Processor.ts, Switcher.ts, Packer.ts,
                Medium.ts, VirtualType.ts, Param.ts, Order.ts, NameTable.ts,
                Env.ts, OperationContext.ts
      usecase/  blueprint.ts, operate.ts, runFoundry.ts
    Example/    ProfileFoundry.ts, TodoFoundry.ts
    index.ts    — re-exports Alignment/ and Foundry/
```

### 4.2 Current Dependency Graph (TO BE CHANGED)

```
plgg-foundry depends on:
  ├── plgg        (file dependency)  — types, pipe, proc, cast, Box, etc.
  └── plgg-kit    (file dependency)  — Provider type, openai(), generateObject()  ← TO BE REMOVED
```

### 4.3 PLGG Foundation Usage in Foundry

Foundry uses PLGG foundations extensively:
- Types: `Str`, `KebabCase`, `Bool`, `Obj`, `Vec`, `Bin`, `Box`, `Option`, `Dict`, `Result`, `PromisedResult`, `Datum`
- Utilities: `box`, `pipe`, `proc`, `cast`, `find`, `filter`, `ok`, `err`, `some`, `none`, `isSome`, `isOk`, `isObj`, `isBoxWithTag`, `unbox`, `asStr`, `asObj`, `asBox`, `asBin`, `asReadonlyArray`, `forProp`, `forContent`, `forOptionProp`, `asSoftStr`, `chainResult`, `conclude`, `tryCatch`, `pattern`, `flow`
- Source files: 22 non-test, 6 test

### 4.4 Foundry Violations (All In Scope)

| ID | Location | Violation | Resolution |
|----|----------|-----------|------------|
| V1 | `Foundry.ts:68` | `box("Str")(spec.description) as Str` | Replace with `unsafeStr(spec.description)` |
| V2 | `Processor.ts:72` | `box("KebabCase")(spec.name) as KebabCase` | Replace with `unsafeKebabCase(spec.name)` |
| V3 | `Processor.ts:73` | `box("Str")(spec.description) as Str` | Replace with `unsafeStr(spec.description)` |
| V4 | `Switcher.ts:93` | `box("KebabCase")(spec.name) as KebabCase` | Replace with `unsafeKebabCase(spec.name)` |
| V5 | `Switcher.ts:94` | `box("Str")(spec.description) as Str` | Replace with `unsafeStr(spec.description)` |
| V6 | `VirtualType.ts:37` | `box("Str")(spec.type) as Str` | Replace with `unsafeStr(spec.type)` |
| V7 | `VirtualType.ts:39` | `some(spec.optional as Bool)` | Replace with `some(unsafeBool(spec.optional))` |
| V8 | `VirtualType.ts:42` | `box("Str")(spec.description) as Str` | Replace with `unsafeStr(spec.description)` |
| V9 | `operate.ts:247` | `(param as { value: unknown }).value` | Fix via RegisterEntry typing |
| V10 | `operate.ts:367` | `(param as { value: unknown }).value` | Fix via RegisterEntry typing |
| V11 | `operate.ts:472` | `(loaded[1] as { value: unknown }).value` | Fix via RegisterEntry typing |
| V12 | `Foundry.ts` | Imports `Provider` from plgg-kit | Decouple via `GenerateAlignmentFn` |
| V13 | `blueprint.ts` | Imports `generateObject` from plgg-kit | Decouple via `GenerateAlignmentFn` |

---

## 5. Target Architecture (Consensus-Approved)

### 5.1 Target Dependency Graph

```
Layer 0: plgg (Foundation)
  - Pure TypeScript, zero deps
  - Types, type classes, composition primitives, data algebra
  - NEW: unsafe* asserting constructors for Str, KebabCase, Bool

Layer 1a: plgg-kit (Kit)
  - Depends only on plgg
  - Vendor integrations (LLM providers)
  - NEW: asProvider cast chain (complete)
  - NEW: createGenerateAlignment adapter for Foundry

Layer 1b: plgg-foundry (Foundry)
  - Depends only on plgg (Kit dependency REMOVED)
  - AI pipeline orchestration engine
  - NEW: GenerateAlignmentFn abstraction type
  - NEW: RegisterEntry type for proper Env typing
```

Note: Kit and Foundry are now **peer layers** (both at Layer 1), not stacked. Neither depends on the other. User code composes them:

```
Application code
  ├── imports plgg-foundry (makeFoundry, runFoundry)
  ├── imports plgg-kit (createGenerateAlignment, openai)
  └── imports plgg (foundation types as needed)
```

### 5.2 Foundry-Kit Decoupling (Consensus Decision)

The Foundry-Kit lateral dependency is removed by introducing an abstraction:

**In plgg-foundry** — Define the function type:
```typescript
// Foundry/model/GenerateAlignment.ts
export type GenerateAlignmentFn = (args: {
  systemPrompt: string;
  userPrompt: string;
  schema: Datum;
}) => PromisedResult<unknown, Error>;
```

**Foundry type changes**:
```typescript
// BEFORE (Foundry.ts)
import { Provider, openai } from "plgg-kit";
export type Foundry = Readonly<{
  provider: Provider;
  description: Str;
  ...
}>;

// AFTER (Foundry.ts)
import { GenerateAlignmentFn } from "plgg-foundry/index";
export type Foundry = Readonly<{
  generateAlignment: GenerateAlignmentFn;
  description: Str;
  ...
}>;
```

**blueprint.ts changes**:
```typescript
// BEFORE
import { generateObject } from "plgg-kit";
// calls generateObject({ provider: foundry.provider, ... })

// AFTER
// calls foundry.generateAlignment({ systemPrompt, userPrompt, schema })
```

**In plgg-kit** — Provide ready-made adapter:
```typescript
// LLMs/usecase/createGenerateAlignment.ts
import { GenerateAlignmentFn } from "plgg-foundry";  // type-only import, OR
// Define locally to avoid circular dep:
import { PromisedResult, Datum } from "plgg";
import { Provider } from "plgg-kit/LLMs/model";
import { generateObject } from "plgg-kit/LLMs/usecase";

export const createGenerateAlignment = (
  provider: Provider
): GenerateAlignmentFn =>
  ({ systemPrompt, userPrompt, schema }) =>
    generateObject({ provider, systemPrompt, userPrompt, schema });
```

**Condition (from consensus)**: Kit must provide a ready-made adapter so default usage stays simple:
```typescript
// User code — simple default usage
import { makeFoundry } from "plgg-foundry";
import { createGenerateAlignment, openai } from "plgg-kit";

const foundry = makeFoundry({
  description: "My foundry",
  apparatuses: [...],
  generateAlignment: createGenerateAlignment(openai("gpt-5.1")),
});
```

**Important design note**: The `GenerateAlignmentFn` type is defined in Foundry using only PLGG types (`Datum`, `PromisedResult`). Kit's adapter can either import this type from Foundry (type-only import, acceptable) or duplicate the type signature locally. The key constraint is that Foundry has **zero runtime imports** from Kit.

### 5.3 RegisterEntry Type (Param/Env Fix)

```typescript
// Foundry/model/Param.ts — REVISED
export type RegisterEntry = Readonly<{
  value: unknown;
  type?: VirtualType;
}>;

// Value passed to processors/switchers (after extraction)
export type Param = unknown;

// Foundry/model/Env.ts — REVISED
export type Env = Record<Address, RegisterEntry>;
```

This eliminates V9-V11 by giving `operate.ts` proper type access to `.value` on RegisterEntry.

### 5.4 Asserting Constructors (`unsafe*`)

Three functions added to PLGG foundation (consensus-scoped):

| Function | Module | Behavior |
|----------|--------|----------|
| `unsafeStr(value: string): Str` | `Basics/Str.ts` | Calls `asStr`, throws `InvalidError` if Err |
| `unsafeKebabCase(value: string): KebabCase` | `Basics/KebabCase.ts` | Calls `asKebabCase`, throws `InvalidError` if Err |
| `unsafeBool(value: boolean): Bool` | `Atomics/Bool.ts` | Wraps as `Bool`, throws if not boolean |

Pattern:
```typescript
export const unsafeStr = (value: string): Str => {
  const result = asStr(value);
  if (isOk(result)) return result.content;
  throw result.content;  // InvalidError already
};
```

---

## 6. Agreed Scope Summary

### In Scope (Consensus-Approved)

| Item | Source | Priority |
|------|--------|----------|
| Add `unsafeStr`, `unsafeKebabCase`, `unsafeBool` to PLGG | Design Phase 1 (narrowed) | Must |
| Fix `Param`/`Env` typing with `RegisterEntry` | Design Phase 2 | Must |
| Replace all `as` casts in Foundry with `unsafe*` functions | Design Phase 3 | Must |
| Extract shared `formatEntries` from Processor/Switcher | Design Phase 4 | Must |
| Decouple Foundry from Kit via `GenerateAlignmentFn` | Architect proposal (accepted) | Must |
| Remove `@ts-ignore` from `Kind.ts` MapKind3 | Model G7 | Must |
| Implement `asProvider` cast chain in Kit | Model G8 | Must |
| Remove stray `plgg-kit/TodoFoundry.ts` | Model G10 | Must |

### Deferred (Consensus-Approved)

| Item | Reason |
|------|--------|
| G9: `toJsonString`/`parseJsonValue` duplication in operate.ts | Lower priority, functional as-is |
| Test file `as any` cleanup (11 occurrences) | Separate effort, not blocking |
| Additional `unsafe*` beyond the 3 needed types | YAGNI — add when violations appear |

---

## 7. Risk Assessment (Updated)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Foundry public API change (Provider -> GenerateAlignmentFn) | High | Kit provides ready-made adapter; Example code updated simultaneously |
| Type changes in Param/Env cascade through operate.ts | Medium | RegisterEntry is structurally compatible; existing tests verify |
| `unsafe*` throwing introduces dual error model | Low | `unsafe` prefix clearly signals throwing behavior; `as*` remains primary |
| MapKind3 removal may affect future plans | Low | No ReaderTaskResult exists; remove the `@ts-ignore`, keep empty interface |
| Removing stray TodoFoundry.ts loses work | Low | Inspect file content first; it's outside src/ and not imported |

---

## 8. Implementation Phase Mapping

```
Phase 1: PLGG Foundation (unsafe* constructors)
  ├── Add unsafeStr to Basics/Str.ts
  ├── Add unsafeKebabCase to Basics/KebabCase.ts
  ├── Add unsafeBool to Atomics/Bool.ts
  ├── Remove @ts-ignore from Kind.ts (G7)
  └── Export new functions via index barrels

Phase 2: Foundry Typing (RegisterEntry + Decoupling)
  ├── Define RegisterEntry type in Param.ts
  ├── Update Env type to use RegisterEntry
  ├── Define GenerateAlignmentFn type
  ├── Update Foundry type (provider -> generateAlignment)
  ├── Update makeFoundry signature
  ├── Update blueprint.ts to use foundry.generateAlignment
  └── Remove plgg-kit from plgg-foundry/package.json

Phase 3: Foundry as-cast Elimination
  ├── Replace all box(...) as Type with unsafe* calls (V1-V8)
  ├── operate.ts as-casts resolve automatically from Phase 2 (V9-V11)
  └── Extract shared formatEntries to Apparatus.ts

Phase 4: Kit Completion
  ├── Implement asProvider cast chain
  ├── Add createGenerateAlignment adapter
  ├── Remove stray TodoFoundry.ts (G10)
  └── Export new functions via index barrels

Phase 5: Verification
  ├── sh/tsc-plgg.sh
  ├── sh/test-plgg.sh
  ├── sh/tsc-plgg-foundry.sh
  ├── sh/test-plgg-foundry.sh
  ├── sh/tsc-plgg-kit.sh
  ├── sh/test-plgg-kit.sh
  └── sh/check-all.sh
```

---

## 9. Metrics Summary

### Current State

| Metric | plgg | plgg-kit | plgg-foundry | example |
|--------|------|----------|-------------|---------|
| Non-test source files | 107 | 4 | 22 | 3 |
| Test files | 61 | 4 | 6 | 0 |
| External prod deps | 0 | 0 | 0 | 1 (glob) |
| Imports from plgg | self | heavy | heavy | light |
| Imports from plgg-kit | none | self | 2 files | none |
| `as` violations (source) | 0 | 0 | 11 | 0 |
| `as any` (tests) | 8 | 0 | 0 | 0 |
| `@ts-ignore` | 1 | 0 | 0 | 0 |

### Target State (Post-Refactoring)

| Metric | plgg | plgg-kit | plgg-foundry | example |
|--------|------|----------|-------------|---------|
| Non-test source files | 107 | 5 (+adapter) | 22 | 3 |
| External prod deps | 0 | 0 | 0 | 1 (glob) |
| Imports from plgg | self | heavy | heavy | light |
| Imports from plgg-kit | none | self | **0 files** | none |
| `as` violations (source) | **0** | **0** | **0** | 0 |
| `@ts-ignore` | **0** | 0 | 0 | 0 |
