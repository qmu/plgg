---
created_at: 2026-02-26T05:37:44+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort:
commit_hash:
category:
---

# Make Comprehensive README.md

## Overview

Rewrite the root `README.md` to serve as a comprehensive project overview and entry point for the plgg monorepo. The current README is minimal (40 lines) and only shows a basic Quick Start for the core plgg package. It omits key information about the project's functional programming architecture, the three sub-packages (plgg, plgg-kit, plgg-foundry), development workflows, module organization, and the type-safe patterns that define the library.

## Key Files

- `README.md` - Root monorepo README to be rewritten (currently 40 lines)
- `src/plgg/README.md` - Sub-package README for the core library (39 lines, similarly minimal)
- `src/plgg-kit/README.md` - Sub-package README for LLM provider abstractions (228 lines, already comprehensive)
- `src/plgg-foundry/README.md` - Sub-package README for workflow orchestration (732 lines, already comprehensive)
- `src/plgg/package.json` - Core package metadata (version 0.0.25, description: "Pipeline Utility")
- `src/plgg-kit/package.json` - Kit package metadata (version 0.0.1, description: "Vendor dependencies for plgg projects")
- `src/plgg-foundry/package.json` - Foundry package metadata (version 0.0.1)
- `src/plgg/src/index.ts` - Main entry point exporting 11 module categories
- `CLAUDE.md` - Development instructions (type-check and test commands)
- `CHANGELOG.md` - Root changelog documenting tooling and CI changes
- `LICENSE` - MIT License (Copyright 2025 qmu)
- `sh/` - Shell scripts for build, test, type-check, and publish workflows

## Related History

The README has been managed by a `readme-updater` agent (`.claude/agents/readme-updater.md`) that incrementally updates sub-package READMEs when code changes are committed. However, the root README has not received a comprehensive overhaul to reflect the full monorepo structure.

Past tickets that touched similar areas:

- [20260226032724-add-claude-settings-json.md](.workaholic/tickets/archive/drive-20260226-032733/20260226032724-add-claude-settings-json.md) - Added .claude/settings.json (same layer: Config, same branch)

## Implementation Steps

1. **Rewrite root `README.md`** with the following sections:

   a. **Header and badges** - Project name, unstable warning, brief tagline ("A functional programming toolkit for TypeScript with type-safe pipelines, Result/Option monads, and AI workflow orchestration")

   b. **Project Structure** - Expanded monorepo overview describing all four directories:
      - `src/plgg/` - Core library: type-safe functional primitives (Result, Option, Vec, cast/proc pipelines, branded types, numeric types)
      - `src/plgg-kit/` - LLM provider abstractions (OpenAI, Anthropic, Google) with structured output support
      - `src/plgg-foundry/` - AI-powered workflow orchestration (Foundry, Alignment, register machine model)
      - `src/example/` - Example usage project

   c. **Installation** - npm install instructions for each package

   d. **Core Concepts** - Explain the foundational patterns:
      - `Result<T, E>` (Ok/Err) for error handling without exceptions
      - `Option<T>` (Some/None) for null-safe values
      - `Box<TAG, CONTENT>` as the tagged union foundation
      - `cast()` for synchronous type-safe pipeline composition
      - `proc()` for async pipeline composition with automatic error propagation
      - `env()` for safe environment variable access
      - Typeclass hierarchy (Functor, Applicative, Monad, Foldable, Traversable)

   e. **Module Organization** - Document the 11 module categories exported from plgg:
      - Abstracts (Principals: Functor, Applicative, Monad, etc. / Servables: Castable, Refinable, JsonSerializable)
      - Atomics (Num, Bool, BigInt, Bin, SoftStr, Time, Int)
      - Basics (Str, Float, integer types I8-I128/U8-U128, string case types CamelCase/PascalCase/KebabCase/SnakeCase/CapitalCase, Alphabet, Alphanumeric)
      - Collectives (Vec, MutVec, ReadonlyArray, VecLike)
      - Conjunctives (Obj, Dict, RawObj)
      - Contextuals (Box, Ok, Err, Some, None, Icon, NominalDatum, OptionalDatum, Pattern, UntaggedBox)
      - Disjunctives (Result, Option, Datum, JsonReady, Atomic, Basic, ObjLike)
      - Exceptionals (BaseError, Exception, InvalidError, PlggError, DeserializeError, SerializeError)
      - Flowables (cast, proc, flow, pipe, match)
      - Functionals (env, bind, conclude, debug, defined, filter, find, hold, pass, refine, tap, tryCatch, postJson, atIndex, atProp)
      - Grammaticals (Brand, Function, NonNeverFn, Procedural, PromisedResult, BoolAlgebra)

   f. **Quick Start Examples** - Multiple usage examples:
      - Type-safe validation with `cast`
      - Async pipelines with `proc`
      - Result/Option pattern matching
      - Vec operations

   g. **Sub-package Overview** - Brief summaries with links to each sub-package README:
      - plgg-kit: what it does, link to `src/plgg-kit/README.md`
      - plgg-foundry: what it does, link to `src/plgg-foundry/README.md`

   h. **Development** - Commands for contributors:
      - `sh/tsc-plgg.sh` - Type check
      - `sh/test-plgg.sh` - Run tests
      - `sh/build.sh` - Build
      - `sh/test-plgg-kit.sh`, `sh/test-plgg-foundry.sh` - Sub-package tests
      - `sh/coverage-plgg.sh` - Coverage

   i. **License** - MIT License with link to LICENSE file

2. **Update `src/plgg/README.md`** to be consistent with the root README's description of the core library, adding module categories and more usage examples. It should reference the root README for monorepo-level information.

## Considerations

- The `readme-updater` agent (`.claude/agents/readme-updater.md`) currently only references `src/plgg/README.md` and `src/plgg-foundry/README.md` but not `src/plgg-kit/README.md` -- the root README rewrite should account for all three sub-packages
- The existing `src/plgg-kit/README.md` and `src/plgg-foundry/README.md` are already comprehensive (228 and 732 lines respectively), so the root README should link to them rather than duplicate their content
- The Quick Start in the current root README uses `chain` which does not appear in the public exports -- the actual function is `cast` (`src/plgg/src/Flowables/cast.ts`). The example also references `Str`, `Num`, `Obj` but the actual module structure uses `Basics/Str`, `Atomics/Num`, `Conjunctives/Obj`. Verify that the flattened re-exports make these available as top-level imports before including in examples
- The `.claude/commands/readme.md` instructs to "respect the original structure" but since this is a comprehensive rewrite, the structure will necessarily change significantly
- The project's version is 0.0.25 for plgg and 0.0.1 for plgg-kit and plgg-foundry -- the unstable warning should remain prominent (`README.md` line 3)
- The copyright year in LICENSE is 2025 (`LICENSE` line 3) -- ensure README license section matches
