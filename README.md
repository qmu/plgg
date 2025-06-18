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
import { chain, Str, Num, Obj, proc } from 'plgg';

// Define a user validator
const validateUser = chain(
  rawInput,
  Obj.cast,
  Obj.prop('name', Str.cast),
  Obj.prop('age', chain(Num.cast, Num.gt(0))),
  Obj.optional('email', Str.cast)
);

// Use with error handling
const result = await validateUser(userInput);
if (isOk(result)) {
  console.log('Valid user:', result.ok);
} else {
  console.error('Validation failed:', result.err.message);
}
```

## Core Modules

### Semantics

Foundation types for functional programming:

```typescript
import { Result, Option, Brand, Procedural } from 'plgg';

// Result type for error handling
type Result<T, F> = Ok<T> | Err<F>;

// Option type for nullable values  
type Option<T> = Some<T> | None;

// Brand type for nominal typing
type UserId = Brand<string, 'UserId'>;

// Procedural type for async operations
type Procedural<T, E = PlggError.t> = Promise<Result<T, E>>;
```

### Primitives

Type-safe primitive operations with validation:

```typescript
import { Str, Num, Bool, Time } from 'plgg';

// String validation with constraints
const validateName = chain(
  Str.cast,
  Str.lenGt(0),
  Str.lenLt(50)
);

// Number validation with bounds
const validateAge = chain(
  Num.cast,
  Num.gt(0),
  Num.lt(150)
);

// Boolean validation
const isActive = Bool.cast(value);

// Date validation
const validDate = Time.cast('2023-12-01');
```

### Pipes

Function composition and pipeline utilities:

```typescript
import { chain, proc, synth, mapOk, mapErr } from 'plgg';

// Chain operations with error short-circuiting
const validateAndTransform = chain(
  input,
  validateInput,
  transformData,
  saveToDatabase
);

// Simple function piping
const result = proc(
  data,
  normalize,
  validate,
  transform
);

// Create reusable pipelines
const userValidator = synth(
  Obj.cast,
  Obj.prop('name', Str.cast),
  Obj.prop('age', Num.cast)
);

// Transform success/error values
const handleResult = chain(
  operation,
  mapOk(data => ({ ...data, processed: true })),
  mapErr(error => new ProcessingError(error.message))
);
```

### Conjunctives

Object validation and manipulation:

```typescript
import { Obj } from 'plgg';

// Object with required properties
const validateUser = chain(
  Obj.cast,
  Obj.prop('id', Str.cast),
  Obj.prop('name', Str.cast),
  Obj.prop('age', Num.cast)
);

// Object with optional properties  
const validateProfile = chain(
  Obj.cast,
  Obj.prop('userId', Str.cast),
  Obj.optional('bio', Str.cast),
  Obj.optional('avatar', Str.cast)
);
```

## Error Handling

plgg uses explicit error handling through Result types:

```typescript
import { isOk, isErr, PlggError } from 'plgg';

const result = await someOperation();

if (isOk(result)) {
  // Handle success case
  console.log('Success:', result.ok);
} else if (isErr(result)) {
  // Handle error case
  if (PlggError.is(result.err)) {
    PlggError.debug(result.err); // Pretty print error chain
  }
  console.error('Error:', result.err.message);
}
```

## Branded Types

Create semantically distinct types:

```typescript
import { Brand, BrandStr } from 'plgg';

type UserId = Brand<string, 'UserId'>;
type Email = Brand<string, 'Email'>;

const validateUserId = BrandStr.cast<'UserId'>;
const validateEmail = chain(
  BrandStr.cast<'Email'>,
  // Additional email validation...
);

// TypeScript prevents mixing different branded types
const userId: UserId = 'user123' as UserId; // ✓
const email: Email = userId; // ✗ Type error
```

## Advanced Usage

### Custom Validators

```typescript
import { Procedural, success, fail, ValidationError } from 'plgg';

const validateEmailFormat = (value: string): Procedural<string> => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value)
    ? success(value)
    : fail(new ValidationError('Invalid email format'));
};

// Use in chains
const validateUser = chain(
  Obj.cast,
  Obj.prop('email', chain(Str.cast, validateEmailFormat))
);
```

### Error Transformation

```typescript
import { capture, mapProcErr } from 'plgg';

// Transform error types
const handleDatabaseError = capture((error: DatabaseError) => 
  new UserFacingError('Unable to save user data')
);

// Map error values
const withRetry = mapProcErr((error: NetworkError) => 
  retryOperation(3)
);
```

### Complex Pipelines

```typescript
// Create a complete user registration pipeline
const registerUser = synth(
  // Validate input
  Obj.cast,
  Obj.prop('email', chain(Str.cast, validateEmailFormat)),
  Obj.prop('password', chain(Str.cast, validatePassword)),
  Obj.prop('name', chain(Str.cast, Str.lenGt(0))),
  
  // Transform data
  hashPassword,
  generateUserId,
  
  // Save to database
  saveUser,
  
  // Send welcome email
  sendWelcomeEmail
);

const result = await registerUser(userInput);
```

## API Reference

### Semantics
- `Result<T, F>` - Success/error union type
- `Option<T>` - Optional value type
- `Brand<T, U>` - Nominal typing
- `Procedural<T, E>` - Async Result wrapper
- `MaybePromise<T>` - Sync/async union type

### Primitives
- `Bool`, `Str`, `Num`, `Time` - Basic primitive types
- `BrandBool`, `BrandStr`, `BrandNum` - Branded variants
- `Primitive` - Union of all primitive types

### Pipes
- `chain()` - Error-aware function chaining
- `proc()` - Simple function piping
- `synth()` - Reusable pipeline creation
- `mapOk()`, `mapErr()` - Result value mapping
- `mapProcOk()`, `mapProcErr()` - Procedural value mapping
- `capture()` - Error type transformation

### Conjunctives
- `Obj.cast()` - Object validation
- `Obj.prop()` - Required property validation
- `Obj.optional()` - Optional property validation

## TypeScript Configuration

plgg requires TypeScript with strict mode enabled. Add path mapping to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@plgg/*": ["./node_modules/plgg/dist/*"]
    }
  }
}
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

ISC License - see LICENSE file for details.
