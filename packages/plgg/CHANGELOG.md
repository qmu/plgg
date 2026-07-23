# Changelog

All notable changes to this project will be documented in this file.

## [0.0.25] - Unreleased

### Added
- `bind` function for monadic context accumulation in proc chains with type-safe tuple syntax (supports 1-5 entries) and proper Result type handling
- `unbox` function and `Unbox` type for recursive nested Box content extraction
- `env` function for safe environment variable access (returns Result, safe for client-side)
- `UnwrapProcedural` type to auto-extract Result content in proc chain
- `Dict` type alias and casting functions in Conjunctives module
- `flow` function for type-safe function composition in Flowables
- `tap` function for side effects in Functionals module
- `find` generic function with type guard support in Functionals
- `filter` function with proper type narrowing in Functionals
- `postJson` utility for HTTP POST requests with JSON
- `tryCatch`, `conclude`, `debug`, `hold`, `pass`, `refine` functions extracted to individual files
- `asVecOf` helper for type-safe array element validation
- `PromisedResult` type alias for `Promise<Result<T, E>>`
- Case validation types: `KebabCase`, `CamelCase`, `PascalCase`, `SnakeCase`, `CapitalCase`
- Character types: `Alphabet`, `Alphanumeric`
- Automatic boxing logic to numeric types (Float, I8-I128, U8-U128)
- Comprehensive test coverage for Basics, Collectives, Conjunctives, Exceptionals, and Grammaticals
- Module documentation with README.md files for all src subdirectories (Abstracts, Atomics, Basics, Collectives, Conjunctives, Contextuals, Disjunctives, Exceptionals, Flowables, Functionals, Grammaticals)

### Changed
- Refactor `Box` type to be fully readonly instead of just content property
- Rename `EmptyBox` to `Icon` for clearer tagged union semantics
- Refactor `Box` to use `Refinable`/`Castable` instead of `Refinable1`/`Castable1`
- Simplify `forContent` and relax `forProp` type constraints
- Simplify `flow` to synchronous execution
- Change `EmptyBox` content from `undefined` to `'__none__'` constant
- Change `isPromise` parameter type from `PossiblyPromise<T>` to `unknown`
- Remove `isSome` and `isNone` methods from Option types
- Update `conclude` function to return Error array
- Simplify types by replacing `Obj`/`Dict` with `Readonly`/`Record` where appropriate
- Move `conclude` function from Vec to idiom module
- Refactor idiom module to Functionals directory with individual function files
- Remove type assertion from `asReadonlyArray` function
- Rename pattern matchers to use `$` suffix: `ok` to `ok$`, `err` to `err$`, `none` to `none$`, `some` to `some$` (breaking change)
- Rename box constructors: `newOk` to `ok`, `newErr` to `err`, `newBox` to `box`, `newIcon` to `icon`, `newNone` to `none`, `newSome` to `some`, `newUntaggedBox` to `untaggedBox` (breaking change)

### Fixed
- Fix `Procedural` type to prevent union type distribution

### Removed
- Remove `jsonEncode`/`jsonDecode` from Functionals (refactored to use `JsonReady`)
