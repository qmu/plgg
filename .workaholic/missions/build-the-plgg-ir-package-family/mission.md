---
type: Mission
title: Build the plgg-ir Package Family
slug: build-the-plgg-ir-package-family
status: active
created_at: 2026-07-11T20:34:05+09:00
author: a@qmu.jp
tickets:
  - 20260712005001-plgg-ir-syntax-s-expression-parsing.md
  - 20260712005002-plgg-ir-language-static-framework.md
  - 20260712005003-plgg-ir-manifest-core.md
  - 20260712005004-plgg-ir-manifest-web-semantics.md
  - 20260712005005-plgg-ir-manifest-dependency-semantics-acceptance.md
stories: []
concerns: []
---

# Build the plgg-ir Package Family

## Goal

Create a safe semantic boundary between AI-generated intent and deterministic Web-system generation, as a family of three packages:

```text
plgg-ir-syntax     — S-expression parsing/printing with source positions (no domain meaning)
plgg-ir-language   — reusable static language machinery: forms, operators, scopes, name
                     resolution, type checking, diagnostics, normalization, dialect composition
plgg-ir-manifest   — the Domain Manifest dialect: entities, fields, relations, validation,
                     authorization, aggregates, views, actions, derivations, consistency
```

An LLM agent generates a restricted, typed, Lisp-style **Domain Manifest**; the toolchain statically verifies it (syntax → forms → names → types → relations → aggregates → query scope → authorization → dependencies) and normalizes it into a deterministic canonical IR that consumers such as `plggmatic` interpret to generate a standard Web application (models, persistence mappings, validation, authorization, views, navigation, actions, derived values, update ordering).

This directly serves the sacrificial-architecture pillar: the app layer is disposable and regenerated, while the Domain Manifest becomes part of the durable core the framework protects. The IR separates probabilistic AI generation from deterministic behavior — the AI never emits arbitrary TypeScript/SQL/authorization code, only a closed-vocabulary expression the compiler can accept or reject with precise, machine-correctable diagnostics.

Full design rationale (43 sections: why S-expressions, what the language is not, type system, validation/authorization/view/aggregate semantics, verification passes, canonicalization, LLM-oriented design, safety principles): [design.md](design.md).

## Scope

**Done when** the five implementation phases from design.md §38 are built, tested (>90% coverage, house style, no `as`/`any`/`ts-ignore`), and the end-to-end acceptance scenario (§39: clients/projects/tasks/invoices with authorization and scope enforcement) passes against the canonical pipeline `parse → expand → resolve → type-check → verify → normalize`.

In scope:

- **Phase 1 — Syntax** (`plgg-ir-syntax`): tokenizer, parser, printer, atoms (symbols/strings/numbers/booleans), lists, source positions/ranges, syntax diagnostics. Parse–print round-trip stability.
- **Phase 2 — Language framework** (`plgg-ir-language`): form registry, operator registry, semantic scopes, typed references, type checker, diagnostic accumulation, normalization pipeline, canonical serializer, dialect composition.
- **Phase 3 — Manifest core** (`plgg-ir-manifest`): module, entity, field, type, relation, cardinality/inverse, validation, invariant, aggregate (root/members).
- **Phase 4 — Web-system semantics**: query, projection, view, layout, navigation, policy, access/authorize, action, effect. Deny-by-default authorization.
- **Phase 5 — Dependency semantics**: derive, materialize, consistency, dependency graph, topological ordering, cycle detection, aggregate update planning.
- Structured error model (code, severity, message, source range, related locations) suitable for LLM correction loops.
- Canonical IR: deterministic, idempotent normalization; equivalent sources normalize identically.
- One-directional dependencies: `plgg → plgg-ir-syntax → plgg-ir-language → plgg-ir-manifest → plggmatic`; lower layers never import upper ones.
- Three-layer documentation (syntax / language framework / manifest vocabulary).

Out of scope:

- A complete Lisp/Scheme implementation, general-purpose language, or runtime evaluator — no `eval`, I/O, mutation, nondeterminism, or unrestricted user-defined functions.
- Framework-specific encodings in the IR (React components, SQL fragments, hard-coded URLs).
- The `plggmatic` consumer implementation itself (wiring plggmatic to interpret the canonical manifest is follow-on work once the family exists).
- The LLM agent that produces manifests (prompting/generation loops are a consumer concern).
- plggmatic's own DSL dialect and runtime semantics — tracked by the `plggmatic-screen-structure-model-semantics` mission in the `qmu/plggmatic` repository, whose DSL v1 work should evaluate building its reader/checker on this family rather than a parallel stack.

## Acceptance

<!-- Ticket filenames are appended to each item as the tickets are cut at /ticket time. -->

- [x] `plgg-ir-syntax` parses S-expression source into position-aware syntax trees and prints canonically; malformed input yields ranged diagnostics; `parse(print(parse(x))) = parse(x)` holds under property tests — 20260712005001-plgg-ir-syntax-s-expression-parsing.md
- [x] `plgg-ir-language` provides form/operator registries, semantic scopes, and typed references, rejecting unknown forms and operators (closed vocabulary) — 20260712005002-plgg-ir-language-static-framework.md
- [x] `plgg-ir-language` type checker verifies operator/operand/result types, preserving domain types over storage types (e.g. `customer-id ≠ organization-id`, `Money<JPY> + Money<USD>` rejected) with expected/actual diagnostics — 20260712005002-plgg-ir-language-static-framework.md
- [x] `plgg-ir-language` supports dialect composition, diagnostic accumulation, and a normalization pipeline with a canonical serializer; `normalize(normalize(x)) = normalize(x)` holds under property tests — 20260712005002-plgg-ir-language-static-framework.md
- [ ] `plgg-ir-manifest` defines the manifest core (module/entity/field/type/relation/validate/invariant/aggregate) with name resolution, inverse-relation and cardinality verification — 20260712005003-plgg-ir-manifest-core.md
- [ ] `plgg-ir-manifest` web semantics: views, queries, projections, navigation, policies, actions with effects; view references outside the declared query/projection/aggregate scope fail static verification — 20260712005004-plgg-ir-manifest-web-semantics.md
- [ ] Authorization is deny-by-default: update actions without a policy are rejected, and policies must type-check to Boolean — 20260712005004-plgg-ir-manifest-web-semantics.md
- [ ] Dependency semantics: derive/materialize/consistency build a dependency graph with topological update ordering; circular derivations are compile errors — 20260712005005-plgg-ir-manifest-dependency-semantics-acceptance.md
- [ ] Canonical Domain Manifest IR is deterministic and versioned (`(plgg-ir 1 ...)`); equivalent sources normalize to identical canonical output — 20260712005005-plgg-ir-manifest-dependency-semantics-acceptance.md
- [ ] The §39 end-to-end acceptance scenario passes: client/project/task/invoice model, permitted project-name edit accepted, unauthorized edit rejected, `task.project.client.invoices` view access rejected — 20260712005005-plgg-ir-manifest-dependency-semantics-acceptance.md
- [ ] Package dependency direction enforced and wired into the monorepo (build order, install script, check-all, README, guide) with >90% coverage per package — 20260712005001…005005 (each package ticket wires its own; final audit in 20260712005005)
- [ ] Three-layer documentation published: syntax reference, language-framework guide, manifest-language guide — 20260712005005-plgg-ir-manifest-dependency-semantics-acceptance.md

## Changelog

<!-- Append-only, dated timeline relating this mission's tickets and reports over time.
     One line per event ("- YYYY-MM-DD — event — filename"); never rewrite past lines. -->

- 2026-07-11 — Mission created from consolidated design discussion; full rationale captured in design.md
- 2026-07-11 — cross-repo relation recorded: plggmatic DSL dialect (screen-structure mission in qmu/plggmatic) should evaluate building on this family — mission.md
- 2026-07-12 — five phase tickets cut from design.md §38 (syntax / language framework / manifest core / web semantics / dependency semantics + acceptance), dependency-chained — 20260712005001…20260712005005
- 2026-07-12 — ticket archived — 20260712005001-plgg-ir-syntax-s-expression-parsing.md
- 2026-07-12 — ticket archived — 20260712005002-plgg-ir-language-static-framework.md
