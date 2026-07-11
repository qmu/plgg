---
created_at: 2026-07-12T00:50:03+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category:
depends_on: [20260712005002-plgg-ir-language-static-framework.md]
mission: build-the-plgg-ir-package-family
---

# plgg-ir-manifest — Domain Manifest core dialect (Phase 3)

## Overview

Third package of the `plgg-ir` family (design.md §27–30, §38 Phase 3). The
domain-specific layer: the **Domain Manifest dialect** built with
`plgg-ir-language` over `plgg-ir-syntax`. This ticket delivers the manifest
CORE — structure and integrity; web-system semantics (views/policies/
actions) and dependency semantics (derive/materialize) are the two follow-on
tickets.

Vocabulary in scope (from §28, core subset):

```text
plgg-ir (versioned root, `(plgg-ir 1 ...)`)
module entity field type source table column
relation target cardinality inverse required
validate invariant
aggregate root members consistency
```

Semantics in scope:

- **Module/entity/field registration** — name resolution across the module;
  duplicate names are errors.
- **Types** — primitives + nominal domain types (`client-id`) +
  parameterized (`(money JPY)`, `percentage`), declared via `type`;
  persistence mapping forms (`source`/`table`/`column`) parsed and carried
  into the IR (interpretation is the consumer's).
- **Relations** — target resolution, cardinality (one/many), `required`,
  inverse-relation verification: inverse pairs must exist, point back, and
  have compatible cardinalities (§16.5).
- **Validation** — field `validate` forms (`required`, `length-between`,
  `max-length`, `required-when` with typed condition expressions), entity
  `invariant` (cross-field, e.g. `(before starts-at ends-at)`) — all
  type-checked as Boolean-valued expressions over declared fields (§9).
- **Aggregates** — `root`/`members` with root-member relation verification,
  duplicate-membership and missing-root errors (§16.6); `consistency`
  declaration parsed (planning semantics come in Phase 5).
- **Canonical manifest IR (first cut)** — normalization to a deterministic,
  versioned canonical form for the core vocabulary (§33): resolved IDs,
  explicit cardinality/defaults, stable ordering.

## Key Files

- `packages/plgg-ir-language/` (ticket 005002) — registries, scopes, types,
  checker, normalization the dialect is defined with. If the framework needs
  small extensions here, extend it (breaking changes OK), don't work around.
- `packages/plgg-ir-syntax/` — source of trees/diagnostics.
- design.md §7 (manifest example), §8–9, §13–14 (entity graph vs aggregate
  boundary), §16.2–16.6, §28–30, §33 — binding design.
- `scripts/build.sh` (after plgg-ir-language), npm-install.sh, check-all.sh,
  new `scripts/test-plgg-ir-manifest.sh`, README index.

## Policies

- `workaholic:implementation` / type-driven design — the manifest IR model
  is branded/tagged plgg data; exhaustive `match` over form kinds; no
  `as`/`any`/`ts-ignore`; Prettier printWidth 50.
- Unknown forms/keywords inside manifest context are compile errors — never
  silently ignored (§34).
- Coverage >90%; prefer `proc`.

## Implementation Steps

1. Scaffold `packages/plgg-ir-manifest/` (deps: plgg, plgg-ir-syntax,
   plgg-ir-language).
2. Version root: `(plgg-ir 1 (module ...))` — version handling + mismatch
   diagnostics.
3. Core dialect forms: module, entity, field, type, source/table/column,
   relation (target/cardinality/inverse/required), validate + validation
   operators, invariant, aggregate (root/members/consistency).
4. Manifest types: register domain types from field declarations; nominal
   distinctness (`customer-id ≠ organization-id`), parameterized money/
   percentage rules from §8.
5. Verification passes: name resolution (§16.3 subset), relation/inverse/
   cardinality verification (§16.5), aggregate verification (§16.6 minus
   update planning).
6. Canonical IR model + normalization for the core vocabulary; deterministic
   serialization via the framework's canonical serializer.
7. Tests (§40): entity registration, relation resolution, inverse relations,
   aggregate membership, validation typing (incl. `required-when` condition
   type errors, `(>= name 18)`-style expected/actual), canonical-form
   property tests (idempotence, equivalent-source equality).
8. Wire monorepo scripts + README; fresh `check-all`.

## Quality Gate

**Acceptance criteria (mission item 5, plus item 9 groundwork):**
- Manifest core forms parse, resolve, type-check; §7's example manifest is
  accepted end-to-end through parse → expand → resolve → type-check →
  verify → normalize.
- Unknown-relation (`task.invoices`), bad inverse, bad cardinality pair,
  duplicate aggregate membership, missing root — each yields its coded,
  ranged diagnostic.
- Canonical IR is deterministic, versioned, idempotent for the core
  vocabulary.
- >90% coverage; house style; monorepo wiring complete.

**Verification:** `./scripts/test-plgg-ir-manifest.sh` green;
`./scripts/check-all.sh` green.

## Considerations

- This ticket is the first real consumer of the framework — expect to
  discover framework API friction; fix it in plgg-ir-language directly
  (its dist must be rebuilt before this package's tests read it).
- Keep §14's five-scope distinction (entity graph / aggregate boundary /
  query scope / projection / authorization) in the model's vocabulary now
  even though only the first two are enforced here — Phase 4 builds on it.
- `derive`/`materialize` forms are OUT of scope here (Phase 5); reject them
  as unknown for now rather than half-implementing.
- Error codes: namespace as `manifest.<area>.<problem>` (§35 example
  `manifest.view.relation-not-loaded`) from the start.
