# plgg

> **UNSTABLE** - This is experimental study work focused on functional programming concepts. Primarily intended for our own projects, though publicly available.

The core functional programming library. Provides type-safe pipelines, Result/Option monads, validated primitive types, and pattern matching for TypeScript.

This package is part of the [plgg monorepo](../../README.md).

## Installation

```bash
npm install plgg
```

## Quick Start

### Type-Safe Validation with cast

Compose validation functions that return `Result`, with automatic error accumulation for object properties:

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

### Async Pipelines with proc

Chain sync and async functions with automatic Result unwrapping and error short-circuiting:

```typescript
import { proc, isOk } from "plgg";

const result = await proc(
  5,
  (x: number) => x + 1,
  (x: number) => Promise.resolve(x * 2),
  (x: number) => `Result: ${x}`,
);

if (isOk(result)) {
  console.log(result.content); // "Result: 12"
}
```

### Pattern Matching with match

Exhaustive, type-safe pattern matching for tagged unions:

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

### Simple Composition with pipe

Pass a value through a chain of functions:

```typescript
import { pipe } from "plgg";

const result = pipe(
  "hello world",
  (s: string) => s.split(" "),
  (words: string[]) => words.length,
); // 2
```

## Module Categories

All exports are available as top-level imports from `"plgg"`. The library is organized into 11 categories:

### Abstracts

Typeclass interfaces following the Haskell hierarchy: `Functor`, `Apply`, `Applicative`, `Chain`, `Monad`, `Foldable`, `Traversable`. Also provides service interfaces: `Castable`, `Refinable`, `JsonSerializable`.

### Atomics

Primitive validated types: `Num`, `Bool`, `BigInt`, `Bin`, `SoftStr`, `Time`, `Int`. Each has an `is*` type guard and `as*` cast function (e.g., `isNum`, `asNum`).

### Basics

Refined string types (`Str`, `Alphabet`, `Alphanumeric`, `CamelCase`, `PascalCase`, `KebabCase`, `SnakeCase`, `CapitalCase`), floating point (`Float`), and ranged integers (`I8`, `I16`, `I32`, `I64`, `I128`, `U8`, `U16`, `U32`, `U64`, `U128`).

### Collectives

Array types: `Vec`, `MutVec`, `ReadonlyArray`, `VecLike`.

### Conjunctives

Object types: `Obj` (readonly validated record), `Dict` (string-keyed dictionary), `RawObj` (unvalidated object).

### Contextuals

Tagged containers: `Box<TAG, CONTENT>` (universal variant), `Ok`, `Err`, `Some`, `None`, `Icon`, `Pattern`, `NominalDatum`, `OptionalDatum`.

### Disjunctives

Union types and protocols: `Result<T, E>`, `Option<T>`, `Datum`, `JsonReady`, `Atomic`, `Basic`, `ObjLike`. Also provides `forProp` and `forOptionProp` for object property validation.

### Exceptionals

Error types: `BaseError`, `Exception`, `InvalidError`, `PlggError`, `DeserializeError`, `SerializeError`.

### Flowables

Composition primitives: `cast` (sync validation chain), `proc` (async pipeline), `pipe` (simple composition), `flow` (lazy curried composition), `match` (pattern matching).

### Functionals

Utility functions: `env`, `bind`, `conclude`, `debug`, `defined`, `filter`, `find`, `hold`, `pass`, `refine`, `tap`, `tryCatch`, `postJson`, `atIndex`, `atProp`.

### Grammaticals

Type-level constructs: `Brand`, `Function`, `NonNeverFn`, `Procedural`, `PromisedResult`, `BoolAlgebra`.

## Development

```bash
# Type check
npm run tsc

# Run tests
npm test

# Coverage
npm run coverage
```

## License

[MIT License](../../LICENSE) - Copyright (c) 2025 qmu
