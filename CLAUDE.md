# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Core Commands (run from `src/plgg/`):**
- `npm run build` - Build the library using Vite
- `npm test` - Run TypeScript compilation check + Vitest tests  
- `npm run test:watch` - Run tests in watch mode
- `npm run coverage` - Run tests with coverage report
- `npm run tsc:watch` - Watch TypeScript compilation without running tests

**Testing:**
- Test files use `.spec.ts` suffix (e.g. `Result.spec.ts`)
- Use `test()` function from Vitest, not `describe()` or `it()`
- Use `expect()` and `assert()` for assertions
- All tests must pass before committing changes

## Project Architecture

**plgg** is a functional programming library for TypeScript focused on domain semantics, type safety, and composable error handling.

### Core Design Patterns

**Tagged Union Types:** All core types use `_tag` discriminated unions:
- `Result<T, F>`: `{_tag: "Ok", ok: T} | {_tag: "Err", err: F}`
- `Option<T>`: `{_tag: "Some", some: T} | {_tag: "None"}`

**Monadic Error Handling:**
- `Result<T, F>` - Either success (`Ok<T>`) or failure (`Err<F>`)
- `Option<T>` - Either value (`Some<T>`) or absence (`None`)
- `Procedural<T, E>` - Async Result: `Promise<Result<T, E>>`

**Function Composition:**
- `chain()` - Result-aware composition with early error exit
- `proc()` - Simple function composition for async operations
- Both support extensive overloads (up to 20+ parameters)

### Module Structure

```
src/plgg/src/lib/
├── effectfuls/   # Core types: Result, Option, Brand, Procedural
├── primitives/   # Validated types: Str, Num, Bool, Time + Branded variants
├── pipes/        # Composition: chain, proc, synth, idiom
├── conjunctives/ # Object validation: Obj.cast, Obj.prop, Obj.optional
└── errors/       # Error hierarchy: BaseError, ValidationError, DomainError
```

**Export Pattern:** Primitives and conjunctives export as namespaces (`export * as Str`), while effectfuls and pipes export individual functions.

### Key Implementation Details

**Type Guards:** Every type provides `is()` guards and `cast()` validation functions that return `Procedural<T>`.

**Validation Chaining:** Property validation uses composable functions:
```typescript
chain(Obj.cast, Obj.prop('name', Str.cast), Obj.prop('age', chain(Num.cast, Num.gt(0))))
```

**Error Strategy:** Structured errors with `BaseError.detail` and `BaseError.parent` for error chains. Pretty-printed debugging output with color coding.

**Brand Types:** `Brand<T, U extends string>` creates nominal types for domain modeling (e.g., `Brand<string, 'UserId'>`).

### TypeScript Configuration

- **Strict mode required** - The library relies on strict TypeScript settings
- **Path mapping:** `"plgg*": ["./src/*"]` for internal imports (within src/plgg/)
- **Module system:** Uses NodeNext for proper ESM/CJS handling
- **Build target:** ES2021 with declaration files

### Testing Patterns

- Use type guards in tests: `assert(isOk(result))` before accessing `.ok`
- Test both success and error cases for all validation functions
- Verify type safety through TypeScript compilation (`tsc --noEmit`)
- Focus on edge cases for primitive validations (empty strings, boundary numbers)