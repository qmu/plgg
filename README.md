# plgg

> **UNSTABLE** - This is experimental study work focused on functional programming concepts. Primarily intended for our own projects, though publicly available.

A functional programming toolkit for TypeScript with type-safe pipelines, Result/Option monads, and AI workflow orchestration.

## Project Structure

This is a monorepo containing:

- **[`src/plgg/`](src/plgg/)** - Core library: type-safe functional primitives (Result, Option, pipelines, branded types, numeric types)
- **[`src/plgg-kit/`](src/plgg-kit/)** - LLM provider abstractions (OpenAI, Anthropic, Google) with structured output support
- **[`src/plgg-foundry/`](src/plgg-foundry/)** - AI-powered workflow orchestration with a register machine model
- **[`src/example/`](src/example/)** - Example usage project

## Installation

```bash
# Core library
npm install plgg

# LLM provider abstractions (depends on plgg)
npm install plgg-kit

# AI workflow orchestration (depends on plgg and plgg-kit)
npm install plgg-foundry
```

## Core Concepts

### Result\<T, E\> - Error Handling Without Exceptions

`Result` represents either success (`Ok<T>`) or failure (`Err<E>`). All validation and transformation functions return `Result` instead of throwing.

```typescript
import { ok, err, isOk, isErr } from "plgg";

const success = ok(42);      // Ok<number>
const failure = err("oops");  // Err<string>

if (isOk(success)) {
  console.log(success.content); // 42
}
```

### Option\<T\> - Null-Safe Values

`Option` represents either a value (`Some<T>`) or absence (`None`), replacing `null`/`undefined`.

```typescript
import { some, none, isSome, isNone } from "plgg";

const value = some("hello"); // Some<string>
const empty = none();        // None

if (isSome(value)) {
  console.log(value.content); // "hello"
}
```

### Box\<TAG, CONTENT\> - Tagged Union Foundation

`Box` is the universal tagged container that underlies `Ok`, `Err`, `Some`, `None`, `Str`, and all nominal types. Every `Box` has a `tag` discriminant and a `content` payload.

### cast() - Synchronous Type-Safe Validation

`cast` composes synchronous functions that return `Result`, short-circuiting on the first error while accumulating sibling errors from property validations.

```typescript
import {
  cast, asObj, forProp,
  asNum, asSoftStr, asTime,
  isOk,
} from "plgg";
import type {
  Num, SoftStr, Time,
  Result, InvalidError,
} from "plgg";

type UserProfile = {
  id: Num;
  email: SoftStr;
  createdAt: Time;
};

const asUserProfile = (
  data: unknown,
): Result<UserProfile, InvalidError> =>
  cast(
    data,
    asObj,
    forProp("id", asNum),
    forProp("email", asSoftStr),
    forProp("createdAt", asTime),
  );

const result = asUserProfile({
  id: 1,
  email: "user@example.com",
  createdAt: "2025-01-01T00:00:00Z",
});

if (isOk(result)) {
  console.log(result.content);
}
```

### proc() - Async Pipeline Composition

`proc` handles sync/async/Result return types, unwrapping Promises and Results automatically and short-circuiting on errors.

```typescript
import { proc, isOk } from "plgg";

const result = await proc(
  5,
  (x: number) => x + 1,                    // sync
  (x: number) => Promise.resolve(x * 2),   // async
  (x: number) => `Result: ${x}`,           // sync
);

if (isOk(result)) {
  console.log(result.content); // "Result: 12"
}
```

### pipe() - Simple Function Composition

`pipe` passes a value through a chain of functions without Result wrapping.

```typescript
import { pipe } from "plgg";

const result = pipe(
  "hello world",
  (s: string) => s.split(" "),
  (words: string[]) => words.length,
); // 2
```

### match() - Exhaustive Pattern Matching

`match` provides type-safe exhaustive pattern matching for tagged unions, Result, and Option types.

```typescript
import {
  match, ok$, err$, otherwise,
} from "plgg";
import type { Result } from "plgg";

const describe = (
  r: Result<string, number>,
): string =>
  match(
    r,
    [ok$("hello"), () => "Greeting"],
    [err$(404), () => "Not found"],
    [otherwise, () => "Something else"],
  );
```

### env() - Safe Environment Variable Access

`env` returns a `Result` instead of a raw string, safe in both server and browser environments.

```typescript
import { env, isOk } from "plgg";

const apiUrl = env("API_URL");
if (isOk(apiUrl)) {
  console.log(apiUrl.content);
}
```

## Module Organization

plgg exports 11 module categories, all available as top-level imports from `"plgg"`:

| Category | Description | Key Exports |
|---|---|---|
| **Abstracts** | Typeclass interfaces | `Functor`, `Applicative`, `Monad`, `Foldable`, `Traversable`, `Castable`, `Refinable`, `JsonSerializable` |
| **Atomics** | Primitive validated types | `Num`, `Bool`, `BigInt`, `Bin`, `SoftStr`, `Time`, `Int` |
| **Basics** | Refined string and integer types | `Str`, `Float`, `I8`-`I128`, `U8`-`U128`, `CamelCase`, `PascalCase`, `KebabCase`, `SnakeCase`, `Alphabet`, `Alphanumeric` |
| **Collectives** | Array types | `Vec`, `MutVec`, `ReadonlyArray`, `VecLike` |
| **Conjunctives** | Object types | `Obj`, `Dict`, `RawObj` |
| **Contextuals** | Tagged containers | `Box`, `Ok`, `Err`, `Some`, `None`, `Icon`, `Pattern`, `NominalDatum`, `OptionalDatum` |
| **Disjunctives** | Union types and protocols | `Result`, `Option`, `Datum`, `JsonReady`, `Atomic`, `Basic`, `ObjLike` |
| **Exceptionals** | Error types | `BaseError`, `Exception`, `InvalidError`, `PlggError`, `DeserializeError`, `SerializeError` |
| **Flowables** | Composition primitives | `cast`, `proc`, `pipe`, `flow`, `match` |
| **Functionals** | Utility functions | `env`, `bind`, `conclude`, `debug`, `defined`, `filter`, `find`, `hold`, `pass`, `refine`, `tap`, `tryCatch`, `postJson`, `atIndex`, `atProp` |
| **Grammaticals** | Type-level constructs | `Brand`, `Function`, `NonNeverFn`, `Procedural`, `PromisedResult`, `BoolAlgebra` |

## Sub-packages

### plgg-kit

LLM provider abstractions with a unified `generateObject` interface supporting OpenAI, Anthropic, and Google. Provides type-safe structured output generation.

See [src/plgg-kit/README.md](src/plgg-kit/README.md) for details.

### plgg-foundry

AI-powered workflow orchestration using a register machine model. Define operations as `Processor`, `Switcher`, and `Packer` apparatus, and let an LLM generate an execution plan (`Alignment`) from a natural language request.

See [src/plgg-foundry/README.md](src/plgg-foundry/README.md) for details.

## Development

```bash
# Install dependencies for all packages
sh/npm-install.sh

# Type check
sh/tsc-plgg.sh

# Run tests
sh/test-plgg.sh

# Run tests with coverage
sh/coverage-plgg.sh

# Build all packages
sh/build.sh

# Sub-package tests
sh/test-plgg-kit.sh
sh/test-plgg-foundry.sh

# Run all checks (type check + test for all packages)
sh/check-all.sh
```

## License

[MIT License](LICENSE) - Copyright (c) 2025 qmu
