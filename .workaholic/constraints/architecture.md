---
manager: architecture-manager
last_updated: 2026-02-26T04:18:49+09:00
---

# Architecture

The plgg monorepo defines a layered functional type system (`plgg`), vendor adapter layer (`plgg-kit`), and AI operation engine (`plgg-foundry`). These three published packages form a dependency stack with a single upward direction. Structural coherence depends on enforcing this direction and the internal conventions each layer uses.

## Package Dependency Direction

**Bounds**: `plgg` must not import from `plgg-kit`, `plgg-foundry`, or `example`. `plgg-kit` must not import from `plgg-foundry` or `example`. `plgg-foundry` must not import from `example`.

**Rationale**: The dependency stack (`plgg` → `plgg-kit` → `plgg-foundry`) ensures that the foundational type system is free of AI-specific or vendor-specific concerns. Reversing or skipping levels would collapse the abstraction layers and create coupling that prevents independent versioning.

**Affects**: All leader agents modifying `src/plgg/`, `src/plgg-kit/`, `src/plgg-foundry/`, or `src/example/`.

**Criterion**: A compliance check passes if no `import` statement in `src/plgg/src/` references `plgg-kit` or `plgg-foundry`, and no `import` in `src/plgg-kit/src/` references `plgg-foundry`. Verifiable via static import analysis or TypeScript compilation.

**Review trigger**: Revisit if a new package is added to the monorepo or if `plgg-kit` grows beyond vendor adapters.

## Module Export Convention

**Bounds**: Every package must expose its public API exclusively through its root `src/index.ts`. Internal modules may only be imported by consumers using the package-level path alias (e.g., `plgg/Atomics`), never via relative paths that cross package boundaries.

**Rationale**: This convention was established for all four packages and ensures that the `vite-plugin-dts` build produces a coherent single `dist/index.d.ts` declaration file. Breaking this convention would produce incomplete public types.

**Affects**: Leader agents adding new modules or changing import patterns in any package.

**Criterion**: Every new module added to a package must be re-exported from the package's root `src/index.ts` (or a sub-barrel that the root re-exports). Verifiable by checking that TypeScript compilation produces no "not found" errors for the new module's exports.

**Review trigger**: Revisit if a package grows large enough to warrant namespace sub-packages with separate entry points.

## TypeScript Strictness Configuration

**Bounds**: All packages must maintain the current TypeScript strictness settings: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`, `isolatedModules`. The use of `as`, `any`, and `@ts-ignore` is prohibited as stated in `CLAUDE.md`.

**Rationale**: These settings were explicitly chosen across all four packages (identical `tsconfig.json` configurations). They enforce the type discipline that makes the `Result`/`Option`/`cast`/`proc` pipeline pattern reliable without escape hatches.

**Affects**: All leader agents writing TypeScript in any package.

**Criterion**: `sh/tsc-plgg.sh` (and equivalent scripts for other packages) must exit with code 0. Any `as`, `any`, or `@ts-ignore` in source files constitutes a violation.

**Review trigger**: Revisit when upgrading TypeScript major versions or when a new TypeScript feature would provide a safer alternative to a currently-avoided pattern.

## plgg Category Taxonomy

**Bounds**: New types or functions added to `plgg` must be placed in one of the eleven established categories: `Abstracts`, `Atomics`, `Basics`, `Collectives`, `Conjunctives`, `Contextuals`, `Disjunctives`, `Exceptionals`, `Flowables`, `Functionals`, `Grammaticals`. Creating a new top-level category requires an explicit architecture decision.

**Rationale**: The eleven-category taxonomy has proven sufficient for the current library surface. Each category has a clear semantic scope (primitives, containers, control flow, type-level utilities, etc.). Unbounded category growth would dilute discoverability.

**Affects**: Leader agents working on `plgg` feature additions.

**Criterion**: A new file added to `src/plgg/src/` must reside under one of the eleven existing category directories. Verifiable by directory listing.

**Review trigger**: Revisit when adding a fundamentally new type class family (e.g., Reader, Writer, State monads) that does not fit an existing category.

## plgg-foundry Apparatus Interface Stability

**Bounds**: The `Processor`, `Switcher`, and `Packer` apparatus interfaces must remain backward-compatible. Specifically: `Processor.fn` must continue to accept `Medium` and return `unknown`; `Switcher.fn` must continue to return `[boolean, Dict<string, Datum>]`. These are the contracts sent to user-defined functions.

**Rationale**: Applications define custom apparatus functions that depend on these contracts. A breaking change would silently mismatch the runtime contract without TypeScript catching it if the user's function is typed permissively.

**Affects**: Leader agents modifying `src/plgg-foundry/src/Foundry/model/` or `src/plgg-foundry/src/Alignment/model/`.

**Criterion**: The existing `TodoFoundry.spec.ts` and `ProfileFoundry.spec.ts` tests must continue to pass after any change to the apparatus interfaces. Verifiable via `sh/test-plgg-foundry.sh`.

**Review trigger**: Revisit when a major version bump of `plgg-foundry` is planned or when the Alignment schema requires a structural change.

## LLM Provider Abstraction Boundary

**Bounds**: All LLM API calls must go through `plgg-kit`'s `generateObject` function. Direct use of OpenAI, Anthropic, or Google SDK clients from `plgg-foundry` source code is prohibited. New vendor support must be added in `plgg-kit/src/LLMs/vendor/`.

**Rationale**: `plgg-foundry` depends on `plgg-kit` specifically to avoid direct vendor coupling. The `Provider` Box type and `generateObject` dispatcher exist to allow provider switching without changing foundry logic.

**Affects**: Leader agents adding new LLM integrations or modifying the blueprint execution in `plgg-foundry`.

**Criterion**: No `import` from an LLM vendor SDK (e.g., `openai`, `@anthropic-ai/sdk`, `@google/generative-ai`) appears in `src/plgg-foundry/src/`. Verifiable via static import analysis.

**Review trigger**: Revisit when adding a new LLM vendor or when `plgg-kit` is split into separate vendor packages.
