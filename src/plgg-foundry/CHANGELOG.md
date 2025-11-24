# Changelog

All notable changes to this project will be documented in this file.

## [0.0.25] - Unreleased

### Added
- LLMs module with provider abstractions and vendor implementations
  - OpenAI vendor integration with structured outputs
  - Anthropic (Claude) vendor integration with JSON parsing
  - Google Gemini vendor integration
  - `generateObject` usecase for AI-powered object generation
- Comprehensive README.md documentation with examples and API reference
- JSDoc comments throughout the codebase
- Type guards for Spec types (`isProcessorSpec`, `isSwitcherSpec`, `isPackerSpec`)
- `PromisedResult` type usage for async operations
- Runtime validation of egress outputs against Packer specs
- `maxOperationLimit` to foundry with operation counter
- Test suite for blueprint generation
- `asAlignment` casting function
- `VirtualType` for structured type definitions with optional description field
- `NameTable` type for variable-to-address mapping
- Helper functions: `newFoundrySpec`, `newProcessorSpec`, `newSwitcherSpec`, `newPackerSpec`
- `explain` functions for Foundry components (Processor, Switcher, Packer)

### Changed
- Refactor to register machine architecture with address-based storage
- Change Medium params from array to dictionary structure
- Refactor Processor and Switcher to use `Dict` for arguments/returns
- Make processor and switcher functions async with `tryCatch` error handling
- Unify processors, switchers, and packers into single `apparatuses` array
- Refactor Packer to use `Dict<VariableName, VirtualType>` structure
- Rename `carrier` directories to `model` in Alignment and Foundry modules
- Refactor apparatus models to use type discriminators and `fn` property
- Replace `exit` flag with `next: 'egress'` pattern
- Rename operation fields for consistency (`loadAddr`/`saveAddr` to arrays)
- Rename `plggFoundry` to `runFoundry` for consistency
- Change LLMs return types from `Procedural` to `Promise<Result>`
- Refactor Provider naming to use constructors as primary interface
- Refactor blueprint to use `generateObject` from LLMs module
- Include alignment as part of Medium
- Change Processor and Switcher signatures to pass alignment context
- Update blueprint schema to generate array-based addresses
- Adopt plgg type system throughout plgg-foundry

### Fixed
- Fix Packer Box usage to access content property correctly
- Fix `asApparatus` to accept unknown parameter
- Clean up Foundry: simplify spread operator usage

### Removed
- Remove deprecated Foundry vendor files (OpenAI.ts, Claude.ts in Foundry/vendor)
- Remove Option wrapper from returns fields
