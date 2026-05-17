# Direction v1

**Author**: Planner
**Status**: draft
**Reviewed-by**: (none)

## Value Proposition

PLGG occupies a specific niche: a pure TypeScript foundation library providing functional programming primitives (Result, Option, Box, cast, proc, pipe, match) that downstream libraries -- PLGG Kit and PLGG Foundry -- build upon. The refactoring goal is to enforce proper layering so that the foundation remains self-contained and performant, while extension libraries maximize their reuse of the foundation rather than reimplementing primitives independently.

This is not a feature initiative. It is a structural investment that compounds over time. Every hour spent enforcing clean layering now prevents multiplied maintenance costs as the library surface grows.

## Business Rationale

### Why Proper Layering Matters

1. **Foundation integrity**: PLGG as a pure TypeScript library should minimize self-referencing for performance. When a foundation library depends on its own higher-level abstractions, it creates circular reasoning in the dependency graph and hidden performance penalties. Users who import a single primitive should not pay the cost of loading the entire library.

2. **Extension alignment**: PLGG Kit (LLM provider abstractions) and PLGG Foundry (AI workflow orchestration) currently do not fully leverage the PLGG foundation. This means duplicated logic, inconsistent error handling patterns, and diverging type contracts across the ecosystem. When extensions bypass the foundation, the ecosystem fragments -- consumers face different APIs for conceptually identical operations.

3. **Dependency direction**: Clean layering enforces a single direction of dependency flow: Foundation <- Kit <- Foundry. Violations of this direction create coupling that makes independent evolution impossible. Each layer should be deployable and testable in isolation.

## Stakeholder Analysis

### Library Consumers (Application Developers)

- **Need**: Import only what they use without hidden dependency bloat
- **Need**: Consistent APIs across plgg, plgg-kit, and plgg-foundry (e.g., Result handling works identically everywhere)
- **Need**: Predictable performance characteristics from a foundation library
- **Success looks like**: A developer using plgg-foundry's workflow orchestration gets the same Result/Option semantics they learned from plgg core, with no surprises

### Library Contributors (Maintainers and OSS Contributors)

- **Need**: Clear boundaries between modules so contributions don't require understanding the entire codebase
- **Need**: Confidence that changes to the foundation don't silently break extensions
- **Need**: Reduced cognitive load when navigating 11 module categories
- **Success looks like**: A contributor can modify a plgg core module, run `sh/tsc-plgg.sh` and `sh/test-plgg.sh`, and know with confidence whether their change is safe

### Extension Authors (Kit and Foundry Developers)

- **Need**: A stable, well-documented foundation API to build upon
- **Need**: Clear contracts for what the foundation guarantees vs. what extensions must provide
- **Need**: Ability to evolve their extension without waiting for foundation changes
- **Success looks like**: Kit and Foundry can be refactored independently, importing foundation primitives rather than maintaining parallel implementations

### Project Owner (qmu)

- **Need**: Sustainable maintenance trajectory as the library grows
- **Need**: Confidence that the "experimental" status doesn't become permanent technical debt
- **Need**: Clean architecture that enables eventual stability graduation
- **Success looks like**: The codebase is organized enough that stability markers can be applied per-module rather than blanket "unstable" across everything

## Risk Assessment

### Risks of NOT Refactoring

1. **Ecosystem fragmentation**: As Kit and Foundry grow, their divergence from foundation patterns accelerates. The longer this persists, the more expensive alignment becomes.
2. **Performance regression**: Self-referencing in the foundation creates import chains that grow with the library surface, degrading tree-shaking and load times.
3. **Contributor friction**: Without clear layering, new contributors cannot reason about impact boundaries. This suppresses contribution velocity.
4. **Inconsistent user experience**: Consumers encounter different patterns for the same concepts depending on which package they import, eroding trust in the library's coherence.

### Risks of Refactoring

1. **Breaking changes**: Reorganizing modules may break existing consumers. Mitigation: ensure public API surface is preserved even if internal structure changes.
2. **Scope creep**: "Well-organized" is subjective and can expand indefinitely. Mitigation: define concrete success criteria (below) and stop when met.
3. **Regression introduction**: Structural moves can introduce subtle bugs. Mitigation: the existing type system (`as`/`any`/`ts-ignore` prohibition) and test suite provide safety rails.

## Success Criteria

From a business perspective, the refactoring is successful when:

1. **Foundation self-containment**: PLGG core modules do not import from plgg-kit or plgg-foundry. Internal cross-references within plgg core are minimal and justified by performance or type safety needs.

2. **Extension reuse**: plgg-kit and plgg-foundry import and use plgg foundation primitives (Result, Option, Box, cast, proc, etc.) instead of maintaining parallel implementations. Duplicated logic is eliminated or reduced to extension-specific specializations.

3. **Dependency direction enforcement**: The dependency graph flows strictly in one direction: plgg <- plgg-kit <- plgg-foundry. No reverse or lateral dependencies exist.

4. **Zero regression**: All existing tests pass (`sh/test-plgg.sh`, `sh/test-plgg-kit.sh`, `sh/test-plgg-foundry.sh`). Type checking passes (`sh/tsc-plgg.sh`). No `as`, `any`, or `ts-ignore` is introduced.

5. **Module clarity**: Each of the 11 module categories in plgg core has a clear, non-overlapping responsibility. A contributor can identify which category a new primitive belongs to without ambiguity.

## System Positioning

PLGG is positioned as an **opinionated functional foundation** -- not a general-purpose utility library. Its value comes from enforcing a specific programming model (tagged unions, Result-based error handling, type-safe pipelines) consistently across the TypeScript ecosystem it serves.

The extension libraries (Kit and Foundry) are where domain-specific value is created (LLM abstractions, workflow orchestration). But that domain value is only credible if it stands on a reliable foundation. A workflow orchestration library that handles errors differently from its own foundation undermines user confidence.

The refactoring reinforces this positioning: PLGG is the bedrock, Kit and Foundry are the applications of that bedrock, and the boundaries between them are explicit and enforced.

## What "Well-Organized" Means

For this project, "well-organized" is not aesthetic preference. It means:

- **Traceable**: Any type, function, or pattern can be traced to exactly one authoritative module
- **Predictable**: Knowing where something is defined tells you what it depends on and what depends on it
- **Separable**: Each package (plgg, plgg-kit, plgg-foundry) can be understood, tested, and evolved independently
- **Minimal**: The foundation includes only what extensions genuinely need; everything else belongs in an extension

## Review Notes

(Awaiting review from Architect and Constructor)
