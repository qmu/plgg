---
created_at: 2026-07-12T00:50:02+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category:
depends_on: [20260712005001-plgg-ir-syntax-s-expression-parsing.md]
mission: build-the-plgg-ir-package-family
---

# plgg-ir-language — reusable static language framework (Phase 2)

## Overview

Second package of the `plgg-ir` family (design.md §22–26, §38 Phase 2).
A reusable static language-processing framework built on `plgg-ir-syntax`:
form registration, operator registration, semantic scopes, name resolution,
typed references, type checking, diagnostic accumulation, normalization, and
dialect composition — the machinery for building restricted, statically
analyzed IR dialects. It defines **no Domain Manifest vocabulary** (§25: no
entity/field/relation/view/policy — that is `plgg-ir-manifest`, next ticket).

Deliverables (design §23):

- **Form registry** — a dialect registers named forms; each form's `analyze`
  takes a syntax node + analysis context and returns
  `Result<Node, Diagnostics>`. Unknown forms are compile errors (closed
  vocabulary, §36.3). Child-form constraints: required/exclusive/duplicated
  child validation (§16.2).
- **Operator registry** — typed operators
  (`defineOperator({name, parameters, result})` conceptually); unknown
  operators rejected; arity + operand types checked.
- **Type representations** — nominal/branded semantic types (domain types
  distinct from storage types: `customer-id ≠ organization-id`),
  parameterized types (`(money JPY)`; rule shape `Money<C> × Percentage →
  Money<C>`), Boolean/Integer/String/Date primitives, collection vs scalar.
- **Scopes & typed references** — lexical/semantic scope stack, name
  resolution producing typed references; entity/field/…-kind references are
  NOT interchangeable (§36.4) — kinds are the framework's, meanings the
  dialect's.
- **Type checker** — verifies operator/operand/result types with
  expected/actual diagnostics (§8, §16.4).
- **Diagnostic accumulation** — collect many diagnostics per pass, not
  fail-fast; reuse/extend the `plgg-ir-syntax` diagnostic shape with
  expected/actual and related locations (§35).
- **Normalization pipeline + canonical serializer** — ordered passes
  (expand → resolve → type-check → verify → normalize, §32); canonical
  output is deterministic and idempotent: `normalize(normalize(x)) =
  normalize(x)` under property tests; equivalent sources normalize
  identically (§33).
- **Dialect composition** — `compose(coreDialect, domainDialect, ...)`: a
  dialect is a statically registered set of forms/types/operators/scopes/
  analysis rules/normalization rules (§24). No dynamic evaluation.

## Key Files

- `packages/plgg-ir-syntax/` (from ticket 005001) — `Sexp`, ranges,
  diagnostics, printer this package consumes.
- `packages/plgg/src/` — Result/Option/pipe/proc/match primitives; branded
  type (`refinedBrand`) machinery for type representations.
- `scripts/build.sh` — build after `plgg-ir-syntax`; plus npm-install.sh,
  check-all.sh, new `scripts/test-plgg-ir-language.sh`, README index.
- design.md §16.2–16.4, §22–26, §32–35 — binding design.

## Policies

- `workaholic:implementation` / type-driven design — the registries must be
  typed so a dialect definition that lies about its node types fails to
  compile; no `as`/`any`/`ts-ignore` anywhere, including the generic
  registry plumbing (this is the hard part — design the generics so escape
  hatches are never "needed").
- Closed vocabulary and deny-unknown are framework defaults, not dialect
  opt-ins (§34, §36.3).
- Coverage >90%; prefer `proc`; Prettier printWidth 50.

## Implementation Steps

1. Scaffold `packages/plgg-ir-language/` (same template/gotchas as ticket
   005001; dep on plgg + plgg-ir-syntax as `file:` links).
2. Diagnostics: semantic diagnostic model (code/severity/message/range/
   expected/actual/related) + accumulation combinators.
3. Types: semantic type model (primitives, nominal domain types,
   parameterized constructors, collection/scalar), type equality +
   compatibility, formatting for diagnostics.
4. Scopes/references: scope frames, binder + resolver, typed reference kinds.
5. Form & operator registries with child-form constraints and typed
   signatures; analysis context threading (scope, types, diagnostics).
6. Type checker over registered operators/forms (expected/actual output).
7. Normalization pipeline: pass orchestration (expand → resolve → check →
   verify → normalize) + canonical serializer (delegates text form to
   plgg-ir-syntax printer; stable ordering / explicit defaults are pass
   work).
8. Dialect composition: merge registries, detect collisions as errors.
9. Tests (§40): a small **toy dialect** defined in tests exercises scope
   resolution, typed references, operator checking, unknown-form/operator
   rejection, dialect composition, diagnostic accumulation; property tests
   for normalization idempotence and equivalent-source canonical equality.
10. Wire monorepo scripts + README; fresh `check-all`.

## Quality Gate

**Acceptance criteria (mission items 2–4):**
- Unknown forms and operators are rejected (closed vocabulary).
- Type checker verifies operator/operand/result types, preserves domain
  types over storage types, rejects `Money<JPY> + Money<USD>`-class errors
  with expected/actual diagnostics (proven via the toy dialect).
- Dialect composition, diagnostic accumulation, normalization pipeline +
  canonical serializer work; `normalize(normalize(x)) = normalize(x)` holds
  under property tests.
- >90% coverage; house style; monorepo wiring complete.

**Verification:** `./scripts/test-plgg-ir-language.sh` green;
`./scripts/check-all.sh` green from fresh dists.

## Considerations

- The generics here are the riskiest design surface of the family: get the
  `FormDefinition<Node>` / analysis-context typing agreed at drive time
  BEFORE bulk implementation (plgg working style: design before code).
- Do not let framework "kinds" leak manifest semantics; the boundary test
  is "could a completely different dialect (e.g. a workflow language) be
  built on this?" (§22, §41).
- Type inference: only where cheap (§23 "where appropriate") — literals and
  operator results; no unification engine in v1.
- Canonical serializer owns determinism knobs (ordering, explicit
  defaults); keep them dialect-parameterized so manifest canonicalization
  (§16.10) is configuration, not new machinery.
