# plgg-ir-manifest

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

**The Domain Manifest dialect of the `plgg-ir` family** — the
domain-specific layer built with
[plgg-ir-language](../plgg-ir-language/) over
[plgg-ir-syntax](../plgg-ir-syntax/). An LLM agent generates a
restricted, typed, Lisp-style Domain Manifest; `compileManifest`
statically verifies it and produces the deterministic canonical IR
consumers such as `plggmatic` interpret.

```
plgg ── plgg-parser ── plgg-ir-syntax ── plgg-ir-language ── plgg-ir-manifest
```

## The core vocabulary (Phase 3)

```lisp
(plgg-ir 1
  (module project-management
    (entity client
      (table clients)                    ; optional persistence mapping
      (field name
        (type string)                    ; primitives / nominal / (money JPY)
        (column client_name)
        (validate
          (required)
          (length-between 1 200)
          (required-when (= customer-type "corporation"))))
      (relation projects
        (target project)
        (cardinality many)
        (inverse client))
      (invariant (before starts-at ends-at)))
    (aggregate client-aggregate
      (root client)
      (members project)
      (consistency immediate))))
```

Web-system semantics (views, queries, policies, actions) and
dependency semantics (derive, materialize) are the next phases of
the same dialect.

## What is verified statically

- **Version** — the root must be `(plgg-ir 1 ...)`; other versions
  are `manifest.root.unsupported-version`.
- **Closed vocabulary everywhere** — unknown module/entity/field
  clauses and unknown validation rules are compile errors, never
  ignored (design §34).
- **Names** — duplicate entities (via the framework's declare
  pass, with forward references resolving) and duplicate
  field/relation names per entity, each with a "first declared
  here" related location.
- **Types** — field types preserve domain meaning over storage:
  `customer-id ≠ organization-id`, `(money JPY) ≠ (money USD)`;
  validation conditions and invariants must type-check to boolean
  against the entity's own fields, with expected/actual
  diagnostics. Operators are the closed set `and or not = >= <= >
  < before + *`, including `Money<C> + Money<C> → Money<C>` and
  `Money<C> × Percentage → Money<C>` (design §8).
- **Relations** — targets must exist; a declared `inverse` must
  name a relation on the target that points back, and mutually
  declared inverses must reference each other (design §16.5).
- **Aggregates** — roots/members must be declared entities, an
  entity belongs to at most one aggregate, and every member must
  be structurally related to its root (design §16.6).

## The canonical IR

`compileManifest(source)` returns
`Result<{ module, canonical }, ReadonlyArray<SemDiagnostic>>`:

- `module` — the resolved, explicit model (`Module` → `Entity` →
  `Field`/`Relation`, `Aggregate`), the durable artifact consumers
  interpret.
- `canonical` — deterministic canonical text: stable clause
  ordering (entities sorted, `table`/`field`/`relation`/
  `invariant` ordered, members sorted) with expression operand
  order untouched. Equivalent sources produce identical canonical
  output and recompiling canonical output is a fixpoint —
  property-tested, enabling caching, diffing, and content hashing
  (design §33).

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root `CLAUDE.md`).
- Runtime dependencies are `plgg`, `plgg-ir-syntax`, and
  `plgg-ir-language` only.
- After editing a `file:`-linked dependency's source, rebuild its
  `dist` or this package won't see new exports.
