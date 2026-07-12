---
created_at: 2026-07-12T00:50:05+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash: 296d8ef8
category: Added
depends_on: [20260712005004-plgg-ir-manifest-web-semantics.md]
mission: build-the-plgg-ir-package-family
---

# plgg-ir-manifest — Dependency semantics + §39 end-to-end acceptance (Phase 5)

## Overview

Final phase of the mission (design.md §6, §13, §16.9, §38 Phase 5, §39).
Adds derived-value and consistency semantics to the Domain Manifest dialect,
then closes the mission with the end-to-end acceptance scenario and the
three-layer documentation.

Vocabulary added: `derive`, `materialize` (with `consistency`), and the
derivation operators the design uses (`sum`, `count`, `*` over money/
percentage, `children`).

Semantics in scope:

- **Derivations** (§6, §13) — a field `derive`s from an expression over the
  entity/its relations (`(count project.tasks)`,
  `(sum (children order-items subtotal))`, `(* subtotal tax-rate)`);
  type-checked (Money<C> rules from §8). Derived/materialized fields declare
  their source and are not independently writable (§36.6): an action
  `effect` that `set`s a derived field is a compile error (single source of
  truth, §36.7).
- **Materialization & consistency** — `(materialize (consistency immediate))`;
  consistency declarations verified for compatibility across aggregate
  boundaries (§16.9).
- **Dependency graph** (§13, §16.9) — build the field-level dependency graph
  from derivations; topological update ordering (numeric `order` forms are
  rejected — the graph IS the order); **circular derivations are compile
  errors** (§36.8); aggregate update planning: for a change, the ordered
  recomputation/update plan (task change → project.task-count → project row)
  derivable from the canonical IR.
- **Canonical IR completion** — deterministic, versioned `(plgg-ir 1 ...)`
  canonical form covering the full vocabulary, with explicit dependency
  references; equivalent sources normalize identically (mission item 9).
- **§39 acceptance scenario** — a full clients/projects/tasks/invoices
  manifest fixture: permitted project-name edit accepted; edit without
  `project-name-editor` rejected; `(show task.project.client.invoices)`
  from task-detail rejected; client→project navigation accepted.
- **Three-layer documentation** (§41) — syntax reference, language-framework
  guide, manifest-language guide, published the way the repo documents
  packages (README set + guide package wiring, gate-guide-deps if the guide
  container consumes the new packages).

## Key Files

- `packages/plgg-ir-manifest/` (tickets 005003/005004) — the dialect this
  completes.
- design.md §6, §8 (money rules), §13, §16.9–16.10, §33, §36.6–36.8, §39,
  §40 (property tests), §41 (docs) — binding.
- `packages/guide/` + `scripts/gate-guide-deps.sh` — where/how package docs
  join the guide (check the existing pattern before wiring).
- `README.md` — family section for the three packages.

## Policies

- `workaholic:implementation` / type-driven design — the dependency graph is
  data derived from the canonical IR, exposed as a typed API (consumers like
  plggmatic read the plan; they don't re-derive it).
- Cycles/conflicts are errors, never warnings (§36.7–36.8).
- No `as`/`any`/`ts-ignore`; coverage >90%; printWidth 50.

## Implementation Steps

1. Derivation forms + operators; typing rules (incl. §8 money/percentage);
   writability verification (derived fields un-settable by effects;
   conflicting sources of truth rejected).
2. Materialization/consistency forms; cross-boundary consistency
   compatibility checks (§16.9).
3. Dependency graph construction; topological sort; cycle detection with
   diagnostics naming the cycle's members and ranges.
4. Aggregate update planning API over the canonical IR.
5. Canonical IR completion: full-vocabulary normalization; property tests —
   idempotence, equivalent-source equality, "valid manifest → all references
   resolve", "canonical manifest → deterministic serialization" (§40).
6. §39 fixture + end-to-end tests through the whole pipeline
   (parse → expand → resolve → type-check → verify → normalize) proving the
   four accept/reject behaviors.
7. Docs (§41): three-layer documentation; wire guide container if adopted
   there; README family section.
8. Mission close-out: verify every mission acceptance checkbox, tick them in
   mission.md with ticket references, changelog entry.

## Quality Gate

**Acceptance criteria (mission items 8–12):**
- derive/materialize/consistency build a dependency graph with topological
  update ordering; circular derivations are compile errors.
- Canonical Domain Manifest IR is deterministic and versioned; equivalent
  sources normalize to identical canonical output (property-tested).
- §39 scenario passes end-to-end (accept + all three rejections).
- Dependency direction enforced (`plgg → syntax → language → manifest`; no
  upward imports) and full monorepo wiring green; >90% coverage per package.
- Three-layer documentation published.

**Verification:** `./scripts/test-plgg-ir-manifest.sh` and
`./scripts/check-all.sh` green from a fresh build; grep-audit that no
lower-family package imports an upper one.

## Considerations

- Update planning is IR-side analysis only — plggmatic's interpretation
  (actual persistence/update execution) is explicitly out of mission scope.
- `(children order-items subtotal)` implies collection-element field access
  in derivation scope; design its typing deliberately (element scope, not a
  full query language).
- Fixed-point/cyclic semantics are rejected outright in v1 (§36.8) — do not
  add a feature flag.
- Cross-repo note: qmu/plggmatic's screen-structure DSL v1 should evaluate
  building on this family once shipped — worth a line in the final report/
  release note.
