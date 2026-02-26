---
title: Feature Viewpoint
description: Feature inventory, capability matrix, and configuration options for the plgg monorepo.
category: developer
modified_at: 2026-02-26T04:18:49+09:00
commit_hash: ddbb696
---

[English](feature.md) | [Japanese](feature_ja.md)

# Feature Viewpoint

This viewpoint catalogs every observable feature in the plgg monorepo. It covers the functional type system capabilities of `plgg`, the AI pipeline orchestration capabilities of `plgg-foundry`, and the LLM provider integration capabilities of `plgg-kit`. See [Use Case Viewpoint](usecase.md) for concrete usage patterns and [Component Viewpoint](component.md) for module decomposition.

## plgg — Core Feature Inventory

### Feature: Type-Safe Pipeline Composition

`pipe` composes up to 21 synchronous functions with full static type inference. Each step receives the exact output type of the previous step. TypeScript infers the return type of the entire pipeline without annotation.

`flow` provides point-free composition: `flow(f, g)` returns a function equivalent to `(x) => g(f(x))`.

`cast` is a variant of `pipe` for functions returning `Result`. It accumulates sibling errors across failed branches for richer diagnostics.

`proc` is the async variant for `Procedural`-returning functions. It unwraps Promises and Results automatically, short-circuiting on the first `Err`. Supports up to 21 steps.

### Feature: Option and Result Monads

`Option<T>` encodes the presence or absence of a value without null. Constructors: `some(v)`, `none()`. Type guards: `isSome`, `isNone`, `isOption`. Typeclass instances: `optionFunctor`, `optionApply`, `optionApplicative`, `optionChain`, `optionMonad`. Exported method aliases: `mapOption`, `applyOption`, `ofOption`, `chainOption`.

`Result<T, E>` encodes success or failure without exceptions. Constructors: `ok(v)`, `err(e)`. Type guards: `isOk`, `isErr`, `isResult`. Full typeclass instances: `resultFunctor`, `resultApply`, `resultApplicative`, `resultChain`, `resultMonad`, `resultFoldable`, `resultTraversable`. Exported method aliases: `mapResult`, `applyResult`, `ofResult`, `chainResult`, `foldrResult`, `foldlResult`, `traverseResult`, `sequenceResult`.

### Feature: Typeclass Hierarchy (HKT Simulation)

The `Abstracts/Principals/` module provides TypeScript interfaces for standard Haskell-style typeclasses using an open interface augmentation technique for higher-kinded types:

- `Functor1/2/3`: `map`
- `Apply1/2/3`: `ap`
- `Pointed1/2/3`: `of`
- `Applicative1/2/3`: combines Apply + Pointed
- `Chain1/2/3`: `chain`
- `Monad1/2/3`: combines Chain + Applicative
- `Foldable1/2`: `foldr`, `foldl`
- `Traversable1/2`: `traverse`, `sequence`
- `Semigroup`, `Monoid`: `concat`, `empty`

New type constructors register themselves into `MapKind1<A>`, `MapKind2<A,B>`, or `MapKind3<A,B,C>` via module augmentation, making them accessible to generic typeclass-parameterized functions.

### Feature: Primitive Type System with Validation

Every primitive type ships with a validated cast function (`as*`) and a type guard (`is*`).

**Atomics**: `Num`, `BigInt`, `Bool`, `Bin`, `Time`, `SoftStr`, `Int`.
**Basics (refined numerics)**: `I8`, `I16`, `I32`, `I64`, `I128`, `U8`, `U16`, `U32`, `U64`, `U128`, `Float`.
**Basics (branded strings)**: `Str` (non-empty string), `Alphabet` (letters only), `Alphanumeric`, `CamelCase`, `PascalCase`, `KebabCase`, `SnakeCase`, `CapitalCase`.

### Feature: Nominal Typing via Box and Brand

`Box<TAG, CONTENT>` provides nominal typing: `Box<"UserId", string>` is distinct from `Box<"OrderId", string>` at the type level. The `__tag` field discriminates variants at runtime.

`Brand<T, B>` provides compile-time branding without runtime overhead: a `Brand<string, "Email">` is structurally identical to `string` at runtime but distinct to TypeScript.

`Icon` provides a tag-only variant (no content) for enumeration-style values.

### Feature: Pattern Matching

`match` is an exhaustive pattern matching function supporting up to 20 case branches. Patterns can be:
- `Icon` patterns (`pattern("TagName")`) for matching Box tags.
- Atomic literal patterns for boolean/primitive matching.
- `otherwise` sentinel for default fallback.

TypeScript enforces exhaustiveness at the call site: missing a required union variant is a compile error.

### Feature: Aggregate Types

`Obj<T>` is a readonly record where all values must be `Datum`. `Dict<K, V>` is a homogeneous string-keyed dictionary. `Vec<T>` is a typed immutable array. `MutVec<T>` is the mutable counterpart.

### Feature: Error Hierarchy

`PlggError` is the domain error union: `InvalidError | Exception | SerializeError`. All errors carry optional `parent` and `sibling` chains for diagnostic context. `printPlggError` pretty-prints the full error chain with ANSI color codes.

`InvalidError` carries a `message`, optional `parent` (single cause), and `sibling` array (multiple alternative failures from `cast`). `Exception` wraps unexpected errors. `SerializeError` signals serialization failures.

### Feature: Utility Functions

| Function | Description |
|---|---|
| `bind(f)(a)` | Partial application of first argument |
| `tap(f)` | Side-effect injection that returns original value |
| `find({predicate, errMessage})` | Safe array search returning `Result` |
| `filter(predicate)` | Typed array filter |
| `defined(v)` | Guard against undefined |
| `refine(predicate, message)` | Predicate-based refinement cast |
| `conclude(fn)(array)` | Maps `fn` over array, collecting errors |
| `debug(label)` | Logging tap (returns input unchanged) |
| `env(key)` | Reads environment variable, returns `Result<string, Error>` |
| `hold(fn)` | Memoizes a function |
| `atIndex(i)` | Safe array index access |
| `atProp(key)` | Safe object property access |
| `tryCatch(fn)` | Wraps a throwing function in `Result` |
| `postJson(url)(data)` | HTTP POST with JSON body |
| `forProp(key, asFn)` | Validated property extraction for `cast` chains |
| `forOptionProp(key, asFn)` | Optional property extraction |
| `forContent(tag, asFn)` | Box content validation |
| `unbox(v)` | Recursively extracts innermost Box content |

## plgg-foundry — AI Pipeline Feature Inventory

### Feature: Foundry Configuration

`makeFoundry(spec)` creates a `Foundry` value. Configuration options:

| Option | Type | Default | Description |
|---|---|---|---|
| `description` | `string` | required | Sent to AI as foundry context |
| `apparatuses` | `Apparatus[]` | required | Array of Processor, Switcher, Packer instances |
| `provider` | `Provider` | `openai("gpt-5.1")` | LLM provider for blueprint generation |
| `maxOperationLimit` | `number` | `10` | Maximum operations before aborting |
| `beforeOperations` | `callback` | none | Hook called with alignment + order before execution |
| `afterOperations` | `callback` | none | Hook called with medium + order after execution |

### Feature: Apparatus Types

Three apparatus types are available to populate a `Foundry`:

**Processor** (`makeProcessor(spec)`): A named function called during `process` operations. Receives a `Medium` (containing `alignment` and `params`). Returns any value; outputs are mapped to registers via `NameTableEntry[]`.

**Switcher** (`makeSwitcher(spec)`): A named conditional called during `switch` operations. Receives a `Medium`. Returns `[boolean, Dict<string, Datum>]`. The boolean determines which branch (`nextWhenTrue` / `nextWhenFalse`) executes.

**Packer**: Defines egress output field types. Used by the blueprint prompt to inform the AI about expected output schema.

### Feature: AI Blueprint Generation

`blueprint(foundry)(order)` calls the configured LLM with a structured system prompt. The prompt includes:
- Foundry description and apparatus inventory (via `explainFoundry`).
- JSON schema for the expected `Alignment` structure.
- Semantics for all five operation types: `ingress`, `assign`, `process`, `switch`, `egress`.
- Register naming convention (`r0`, `r1`, ...).
- Write-before-read rule for register safety.

The AI returns a structured JSON object that is validated via `asAlignment` before execution.

### Feature: Operation Types in Alignment

| Operation | Fields | Purpose |
|---|---|---|
| `ingress` | `type`, `next` | Entry point; routes to first operation |
| `assign` | `type`, `name`, `address`, `value`, `next` | Writes AI-extracted literal to register |
| `process` | `type`, `name`, `action`, `input[]`, `output[]`, `next` | Calls a Processor, maps registers |
| `switch` | `type`, `name`, `action`, `input[]`, `nextWhenTrue`, `nextWhenFalse`, `outputWhenTrue[]`, `outputWhenFalse[]` | Calls a Switcher, branches |
| `egress` | `type`, `result[]` | Collects named register outputs |

### Feature: Lifecycle Callbacks

`beforeOperations` is called with `{alignment, order}` after the AI-generated alignment is validated but before any operations execute. This allows inspection or logging of the generated plan.

`afterOperations` is called with `{medium, order}` after all operations complete. The `medium` contains the final register state available as `params`.

### Feature: Operation Safety Limit

`maxOperationLimit` (default 10) prevents infinite loops in cyclic alignments. Each operation increments a counter; exceeding the limit returns `Err(new Error("Operation limit exceeded"))`.

## plgg-kit — LLM Integration Feature Inventory

### Feature: Multi-Provider Support

Three LLM vendors are supported with identical interfaces:

| Provider | Tag | Constructor | Env Variable |
|---|---|---|---|
| OpenAI | `"OpenAI"` | `openai(model)` or `openai({model, apiKey})` | `OPENAI_API_KEY` |
| Anthropic | `"Anthropic"` | `anthropic(model)` or `anthropic({model, apiKey})` | `ANTHROPIC_API_KEY` |
| Google | `"Google"` | `google(model)` or `google({model, apiKey})` | `GEMINI_API_KEY` |

API keys can be provided inline at construction time or resolved at runtime from environment variables.

### Feature: Structured Object Generation

`generateObject({provider, systemPrompt, userPrompt, schema})` sends a prompt to the configured LLM and returns a structured object matching the provided JSON schema. The schema is passed as a `Datum` value. Returns `PromisedResult<unknown, Error>`.

## TypeScript Configuration Features

All packages share an identical strict TypeScript configuration:

- `"strict": true` — full strict mode.
- `"noUnusedLocals": true`, `"noUnusedParameters": true` — no dead code.
- `"noUncheckedIndexedAccess": true` — index access returns `T | undefined`.
- `"exactOptionalPropertyTypes": true` — optional props cannot be explicitly `undefined`.
- `"noImplicitReturns": true`, `"noFallthroughCasesInSwitch": true` — exhaustiveness.
- `"allowUnreachableCode": false`, `"allowUnusedLabels": false` — dead code errors.
- `"erasableSyntaxOnly": true` — no `enum` or `namespace` with runtime effects.
- `"isolatedModules": true` — each file compilable independently.
- `as`, `any`, and `@ts-ignore` are prohibited by project rule (CLAUDE.md).

## Assumptions

- **[Explicit]** `maxOperationLimit` defaults to 10 and `provider` defaults to `openai("gpt-5.1")` as hardcoded in `src/plgg-foundry/src/Foundry/model/Foundry.ts`.
- **[Explicit]** The three supported LLM vendors are confirmed by the vendor directory listing: `OpenAI.ts`, `Anthropic.ts`, `Google.ts`.
- **[Explicit]** TypeScript configuration flags are read directly from each package's `tsconfig.json`.
- **[Inferred]** `Packer` apparatus type's role in egress schema is inferred from the blueprint prompt structure and `explainApparatus` usage; no dedicated `makePacker` implementation was observed in the explored files.
- **[Inferred]** `forProp` and `forOptionProp` are specifically designed for chaining within `cast` pipelines for struct-level field validation.
