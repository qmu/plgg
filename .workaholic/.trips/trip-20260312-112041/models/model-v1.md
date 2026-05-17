# Model v1 — PLGG Architectural Analysis

**Author**: Architect
**Version**: 1
**Date**: 2026-03-12

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
- `MapKind1<A>`, `MapKind2<A,B>`, `MapKind3<A,B,C>` registries in `Kind.ts`
- Types register via `declare module "plgg/Abstracts/Principals/Kind"` (e.g., Option registers in `MapKind1`, Result in `MapKind2`)
- Type classes (Functor, Monad, etc.) are parameterized by `KindKey` strings

### 2.4 Composition Primitives

Three distinct composition strategies:
- **`pipe`**: Synchronous pure function composition (`A -> B -> C`)
- **`cast`**: Synchronous Result-chain composition (`A -> Result<B, InvalidError> -> ...`) — used for validation/parsing
- **`proc`**: Async Procedural-chain composition (`A -> Procedural<B> -> ...`) — auto-unwraps Result/Promise, catches exceptions
- **`match`**: Exhaustive pattern matching on Box/Icon/Atomic variants

### 2.5 Box Pattern

`Box<TAG, CONTENT>` is the core nominal wrapper: `{ __tag: TAG, content: CONTENT }`. Used pervasively:
- Atomics like `Str`, `KebabCase` are `Box<"Str", string>`, `Box<"KebabCase", string>`
- Extension types like `Processor`, `Switcher`, `Packer` are `Box<"Processor", {...}>`
- `Pattern` and `Icon` enable exhaustive pattern matching on tagged unions

### 2.6 File Counts

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
```

### 3.2 Dependency Usage

- **Depends on**: `plgg` (file dependency)
- **PLGG usage**: Heavy — uses `Box`, `Obj`, `Option`, `pattern`, `cast`, `proc`, `match`, `env`, `postJson`, `jsonDecode`, `PromisedResult`, `asSoftStr`, `atProp`, `atIndex`, `unbox`, `pipe`, `ok`, `some`, `none`, `forProp`, `forOptionProp`, `forContent`, `asBox`, `asObj`, `asSoftStr`
- **Source files**: 4 non-test, 3 test
- **External deps**: `dotenv` (dev only)

### 3.3 Assessment

Kit is **well-integrated** with PLGG foundations. Provider types use Box pattern properly. The `generateObject` usecase leverages `proc` and `match` correctly. Vendor implementations use `proc` + `postJson` + prop accessors idiomatically.

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

### 4.2 Dependency Graph

```
plgg-foundry depends on:
  ├── plgg        (file dependency)  — types, pipe, proc, cast, Box, etc.
  └── plgg-kit    (file dependency)  — Provider type, openai(), generateObject()
```

**This is the key structural issue**: Foundry depends on Kit for:
1. `Provider` type and `openai()` default in `Foundry.ts` model
2. `generateObject()` in `blueprint.ts` usecase

### 4.3 PLGG Foundation Usage in Foundry

Foundry uses PLGG foundations extensively:
- Types: `Str`, `KebabCase`, `Bool`, `Obj`, `Vec`, `Bin`, `Box`, `Option`, `Dict`, `Result`, `PromisedResult`, `Datum`
- Utilities: `box`, `pipe`, `proc`, `cast`, `find`, `filter`, `ok`, `err`, `some`, `none`, `isSome`, `isOk`, `isObj`, `isBoxWithTag`, `unbox`, `asStr`, `asObj`, `asBox`, `asBin`, `asReadonlyArray`, `forProp`, `forContent`, `forOptionProp`, `asSoftStr`, `chainResult`, `conclude`, `tryCatch`, `pattern`, `flow`
- Source files: 22 non-test, 6 test

### 4.4 Foundry's Internal Reinventions

Some patterns in Foundry bypass PLGG conventions or reinvent existing facilities:
- **`(param as { value: unknown }).value`** in `operate.ts` (lines 247, 366, 472): Uses TypeScript `as` assertion to access env values — structurally unsound
- Commented-out `asProvider` in Provider.ts — cast chain for Provider not implemented
- `Param` type is simply `unknown` — no PLGG type wrapping
- `Env` is `Record<Address, unknown>` — no PLGG type discipline
- `OperationContext` uses plain records rather than PLGG Obj
- JSON value handling (`toJsonString`/`parseJsonValue`) duplicates concepts already in PLGG's JsonReady system

---

## 5. Dependency Analysis

### 5.1 Current Dependency Graph

```
    plgg (Foundation, zero deps)
     ├──► plgg-kit (depends on plgg)
     │     └── LLMs vendor wrappers
     └──► plgg-foundry (depends on plgg AND plgg-kit)
           ├── Alignment model
           └── Foundry engine
                 └── uses generateObject from plgg-kit
```

### 5.2 Layering Violation

The **ideal** dependency direction for a layered architecture:
```
Foundation (plgg) ← Kit (plgg-kit) ← Foundry (plgg-foundry)
```

The **current** situation:
```
Foundation (plgg) ← Kit (plgg-kit)
Foundation (plgg) ← Foundry (plgg-foundry) → Kit (plgg-kit)
```

Foundry depends **sideways** on Kit rather than **upward**. This creates:
1. **Tight coupling**: Foundry's core model (`Foundry` type) embeds `Provider` from Kit
2. **Circular conceptual dependency**: Foundry needs Kit's LLM to generate alignments, but Kit's purpose is general vendor integration
3. **Deployment constraint**: Cannot use Foundry without Kit, even if you bring your own LLM client

### 5.3 The `@ts-ignore` Violation

`Kind.ts:16` contains `// @ts-ignore will have ReaderTaskResult` on the empty `MapKind3<A,B,C>` interface. This violates the CLAUDE.md rule. The interface is unused — it should either be removed or populated.

### 5.4 The `as` Violations in Source Code

`operate.ts` uses `as { value: unknown }` pattern (lines 247, 366, 472) to access Param values. This violates the `as` prohibition rule and indicates the `Param`/`Env` types lack proper structural typing.

Test files (spec.ts) also contain `as any` — 11 occurrences across 3 test files. While less critical than source code, these indicate type modeling gaps.

---

## 6. Structural Gaps

### 6.1 Foundation Self-Usage

PLGG foundation **correctly avoids using itself** for performance (as stated in the user goal). The foundation is pure TypeScript with zero runtime dependencies. Internal imports use path aliases (`plgg/index`, `plgg/Abstracts/...`) but these resolve within the same package.

### 6.2 Extension Libraries Not Maximizing Foundation Usage

| Gap | Location | Description |
|-----|----------|-------------|
| **G1** | Foundry `Param` type | `Param = unknown` — should be `Datum` or a proper PLGG type |
| **G2** | Foundry `Env` type | `Record<Address, unknown>` — should use `Dict<Address, Param>` with proper typing |
| **G3** | Foundry `OperationContext` | Plain TypeScript object — should be structured as `Obj` |
| **G4** | Foundry `operate.ts` | Uses `as { value: unknown }` assertions — needs proper type narrowing |
| **G5** | Foundry-Kit coupling | `Foundry` type directly embeds `Provider` from Kit |
| **G6** | Foundry `blueprint.ts` | Directly calls `generateObject` from Kit — should accept an abstraction |
| **G7** | Kind.ts `@ts-ignore` | Empty `MapKind3` with ts-ignore comment — remove or implement |
| **G8** | `Provider` missing cast | `asProvider` is commented out — Provider lacks proper `cast` chain |
| **G9** | Foundry JSON handling | `toJsonString`/`parseJsonValue` in operate.ts reimplements JsonReady concepts |
| **G10** | Stray file | `plgg-kit/TodoFoundry.ts` exists outside `src/` — appears misplaced |

### 6.3 What Is Working Well

- PLGG foundation type system is comprehensive and internally consistent
- Kit layer uses PLGG idioms correctly (Box, cast, proc, match, pattern)
- Foundry model types (Processor, Switcher, Packer, Alignment, Operation) properly use Box pattern
- Foundry's `cast`-based validation (asAlignment, asOrder) follows PLGG conventions
- `pipe`/`proc`/`cast` composition in both Kit and Foundry follows PLGG idioms
- Zero external production dependencies in plgg and plgg-kit (only devDeps)

---

## 7. Proposed Architectural Model

### 7.1 Target Layering

```
Layer 0: plgg (Foundation)
  - Pure TypeScript, zero deps, zero self-usage
  - Types, type classes, composition primitives, data algebra

Layer 1: plgg-kit (Kit)
  - Depends only on plgg
  - Vendor integrations (LLMs, future: HTTP clients, storage, etc.)
  - Provides abstract interfaces AND concrete implementations

Layer 2: plgg-foundry (Foundry)
  - Depends only on plgg
  - AI pipeline orchestration engine
  - Accepts LLM capability through PLGG-typed abstraction (not Kit dependency)
  - Kit provides the concrete LLM implementation at composition time
```

### 7.2 Decoupling Strategy

The core change: **Foundry should depend only on PLGG, not on Kit.**

1. **Extract LLM abstraction into PLGG or Foundry**: Define `GenerateObjectFn` as a function type within Foundry that accepts PLGG types (`Datum`, `Result`, etc.) — no Kit imports needed
2. **Provider becomes injectable**: `Foundry` type replaces `provider: Provider` with `generateObject: GenerateObjectFn`
3. **Kit provides the adapter**: Kit exports a function that creates a `GenerateObjectFn` from a `Provider`
4. **User composition**: `makeFoundry({ generateObject: kitGenerateObject(openai("gpt-5.1")), ... })`

### 7.3 Type Discipline Improvements

1. **`Param`**: Change from `unknown` to `Datum | unknown` or a proper PLGG union
2. **`Env`**: Restructure as typed Dict with `{ type: VirtualType, value: Datum }`
3. **`OperationContext`**: Use PLGG Obj type
4. **Remove all `as` assertions**: Replace with proper type guards and cast chains
5. **Remove `@ts-ignore`**: Remove `MapKind3` or populate it
6. **Complete `asProvider`**: Implement the commented-out cast chain

### 7.4 File Cleanup

1. Remove stray `plgg-kit/TodoFoundry.ts` (outside src/)
2. Consider whether Foundry `Example/` should move to `@plgg/example`

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking Foundry public API by removing Kit dependency | High | Provide migration adapter in Kit |
| Type changes in Param/Env cascade through operate.ts | Medium | Incremental refactoring with test verification |
| MapKind3 removal may affect future plans | Low | Check if ReaderTaskResult is planned — remove if not |
| Test files with `as any` may break during type tightening | Low | Fix tests after source types are corrected |

---

## 9. Metrics Summary

| Metric | plgg | plgg-kit | plgg-foundry | example |
|--------|------|----------|-------------|---------|
| Non-test source files | 107 | 4 | 22 | 3 |
| Test files | 61 | 4 | 6 | 0 |
| External prod deps | 0 | 0 | 0 | 1 (glob) |
| Imports from plgg | self | heavy | heavy | light |
| Imports from plgg-kit | none | self | 2 files | none |
| `as` violations (source) | 0 | 0 | 3 | 0 |
| `as any` (tests) | 8 | 0 | 0 | 0 |
| `@ts-ignore` | 1 | 0 | 0 | 0 |
