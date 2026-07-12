---
created_at: 2026-07-12T00:50:04+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash: 98e96c58
category: Added
depends_on: [20260712005003-plgg-ir-manifest-core.md]
mission: build-the-plgg-ir-package-family
---

# plgg-ir-manifest — Web-system semantics: views, queries, policies, actions (Phase 4)

## Overview

Phase 4 of the mission (design.md §10–12, §14–15, §16.7–16.8, §38 Phase 4).
Extends the Domain Manifest dialect with the vocabulary that describes a
standard Web system, and the static verification that makes boundary
crossings and authorization machine-checkable.

Vocabulary added (§28 remainder minus derive/materialize/consistency-
planning):

```text
query where include one
projection lookup
view subject parameter scope
layout detail section list show
navigate to with
policy allows access authorize
action input effect ensure set
```

Semantics in scope:

- **Queries & query scope** (§15) — a view's query declares what is loaded
  (`(one task)`, `(include task.project)`); the loaded path set IS the scope
  views may reference.
- **Projections** (§15) — explicit cross-boundary exposure
  (`(projection client-summary (from client) (fields ...))`,
  `(lookup client-summary (through task.project.client))`); referencing a
  non-exposed field (`client-summary.invoices`) fails statically.
- **Views, layouts, navigation** (§11) — subject + typed parameters; layout
  forms (`detail`/`section`/`list`/`show`/`action`); `navigate` targets a
  view with typed parameters, never a URL (§37). View verification (§16.7):
  unloaded relation paths, missing route parameters, unavailable fields,
  list-vs-scalar misuse — all rejected. §14's layered diagnostics: a path
  can be structurally reachable (`task.project.client.invoices`) yet
  rejected because it is outside query scope / crosses the aggregate
  boundary / is not projected.
- **Policies & authorization** (§10, §16.8) — `policy` with `allows`
  expression over actor/entity/related paths, type-checked to Boolean;
  entity `access` (read/update, per-field update); action `authorize`
  references a declared policy. **Deny by default** (§36.1): an update
  action without a policy is a compile error.
- **Actions & effects** (§12) — subject, typed `input` with validation,
  `authorize`, `effect` (`set` of a loaded, updatable path from a typed
  input), `ensure` postconditions. Effect target/type checking (§16.4).

## Key Files

- `packages/plgg-ir-manifest/` (ticket 005003) — the dialect this extends;
  §14's scope model groundwork.
- `packages/plgg-ir-language/` — expect further framework friction fixes
  (scope stacks for query scopes, path types); rebuild dist for consumers.
- design.md §10–12, §14–15, §16.7–16.8, §36.1/§36.4/§36.5, §37 — binding.

## Policies

- `workaholic:design` / security — deny-by-default is non-negotiable; every
  execution path (not just UI) must be able to enforce policies, so the IR
  must keep authorization attached to actions/queries in the canonical form
  (`(authorized-by ...)`).
- `workaholic:implementation` / type-driven design — path expressions
  (`task.project.client.invoices`) get a typed model (segments resolved
  against relations), not string parsing at check time.
- No `as`/`any`/`ts-ignore`; coverage >90%; printWidth 50.

## Implementation Steps

1. Path model: typed relation-path resolution over the entity graph
   (scalar/collection cardinality tracked per segment).
2. Query forms + query-scope computation (loaded path set per view).
3. Projection forms + projection-boundary checking.
4. View/layout/navigation forms; view verification pass (§16.7) with §14's
   distinct diagnostics (not-loaded vs aggregate-boundary vs not-projected).
5. Policy/access forms; Boolean type-checking of `allows`; actor reference
   model.
6. Action forms (input/authorize/effect/ensure); effect type/updatability
   checking; deny-by-default pass (§16.8: update action without policy =
   error; policy referencing unavailable data = error).
7. Extend canonical IR + normalization to the new vocabulary (explicit
   policies, resolved view/action/projection IDs, stable ordering).
8. Tests (§40): view query scope, projection restrictions, policy typing,
   action authorization, deny-by-default, navigation parameter checking;
   §14/§15 rejection examples as fixtures.
9. Fresh `check-all`.

## Quality Gate

**Acceptance criteria (mission items 6–7):**
- Views/queries/projections/navigation/policies/actions with effects all
  express and verify; view references outside declared query/projection/
  aggregate scope fail static verification with the layered §14
  diagnostics.
- Deny-by-default: update actions without a policy are rejected; policies
  must type-check to Boolean.
- The §11 client-detail/project-detail views and §12 edit-project-name
  action are accepted; `(show task.project.client.invoices)` in §14's
  task-detail view is rejected.
- >90% coverage; house style.

**Verification:** `./scripts/test-plgg-ir-manifest.sh` green;
`./scripts/check-all.sh` green.

## Considerations

- Largest semantic surface of the family — if drive-time size demands,
  split policies/actions from views/queries at an agreed seam, but keep
  deny-by-default landing in the same change as actions (never ship
  actions without it).
- Layout vocabulary stays consumer-independent (§37): roles and semantics,
  no component names, no URLs.
- `(ensure (valid project))` needs a `valid` operator over entity subjects
  — small but crosses into validation semantics; reuse Phase 3 validation.
- Actor model: keep minimal (`actor.<field>`, `has-role`) and closed; no
  session/user framework assumptions.
