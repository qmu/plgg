# plgg

**Domain semantics made functional**

A TypeScript library that provides functional programming primitives, semantic types, and composable utilities for building robust, type-safe applications with explicit error handling.

## Overview

plgg embraces functional programming principles to create a comprehensive toolkit for domain modeling, validation, and error handling. Built around the core concepts of `Result<T, F>` types, branded primitives, and composable operations, plgg enables developers to write safer, more maintainable code.

## Key Features

- 🔒 **Type-Safe Primitives** - Validated primitive types with branded variants
- ⚡ **Functional Error Handling** - Result types that make errors explicit
- 🔗 **Composable Operations** - Pipeline functions for chaining operations
- 🛡️ **Railway-Oriented Programming** - Error short-circuiting in operation chains  
- 📦 **Object Validation** - Type-safe property validation with predicates
- 🎯 **Nominal Typing** - Brand system for semantically distinct types

## Installation

```bash
npm install plgg
```

## Quick Start

```typescript
import { chain, Str, Num, Obj, isOk } from 'plgg';

const validateUser = (input: unknown) => chain(
  input,
  Obj.cast,
  Obj.prop('name', Str.cast),
  Obj.prop('age', chain(Num.cast, Num.gt(0)))
);

const result = validateUser(userInput);
if (isOk(result)) {
  console.log('Valid user:', result.ok);
}
```

## Core Modules

### Semantics
```typescript
import { Result, Option, Brand, Procedural } from 'plgg';

type Result<T, F> = Ok<T> | Err<F>;
type Option<T> = Some<T> | None;
type UserId = Brand<string, 'UserId'>;
type Procedural<T, E = PlggError.t> = Promise<Result<T, E>>;
```

### Primitives
```typescript
import { Str, Num, Bool, Time } from 'plgg';

const validateName = chain(Str.cast, Str.lenGt(0), Str.lenLt(50));
const validateAge = chain(Num.cast, Num.gt(0), Num.lt(150));
const isActive = Bool.cast(value);
const validDate = Time.cast('2023-12-01');
```

### Pipes
```typescript
import { chain, proc, synth, mapOk, mapErr } from 'plgg';

const pipeline = (input: unknown) => chain(input, validate, transform, save);
const result = await proc(data, normalize, validate, transform);
const userValidator = synth(Obj.cast, Obj.prop('name', Str.cast));
```

### Conjunctives
```typescript
import { Obj } from 'plgg';

const validateUser = chain(
  Obj.cast,
  Obj.prop('name', Str.cast),
  Obj.prop('age', Num.cast)
);
```

## Error Handling
```typescript
import { isOk, isErr, PlggError } from 'plgg';

const result = await someOperation();
if (isOk(result)) {
  console.log('Success:', result.ok);
} else {
  console.error('Error:', result.err.message);
}
```

## Branded Types
```typescript
import { Brand, BrandStr } from 'plgg';

type UserId = Brand<string, 'UserId'>;
type Email = Brand<string, 'Email'>;

const validateUserId = BrandStr.cast<'UserId'>;
const validateEmail = chain(BrandStr.cast<'Email'>, emailValidator);
```

## Advanced Usage

```typescript
// Custom validators
const validateEmail = (value: string): Procedural<string> => 
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? success(value)
    : fail(new ValidationError('Invalid email'));

// Error transformation
const handleError = capture((error: DatabaseError) => 
  new UserFacingError('Unable to save data'));

// Complex pipelines
const registerUser = synth(
  Obj.cast,
  Obj.prop('email', chain(Str.cast, validateEmail)),
  Obj.prop('password', validatePassword),
  hashPassword,
  saveUser
);
```

## API Reference

**Semantics:** `Result<T, F>`, `Option<T>`, `Brand<T, U>`, `Procedural<T, E>`  
**Primitives:** `Bool`, `Str`, `Num`, `Time` + branded variants  
**Pipes:** `chain()`, `proc()`, `synth()`, `mapOk()`, `mapErr()`, `capture()`  
**Conjunctives:** `Obj.cast()`, `Obj.prop()`, `Obj.optional()`

## TypeScript Configuration

Requires strict mode:
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

ISC License - see LICENSE file for details.
