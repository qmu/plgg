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

## The web-system vocabulary (Phase 4)

```lisp
(projection client-summary
  (from client)
  (fields client.id client.name))          ; the ONLY way a view crosses its scope

(policy project-name-editor
  (allows (and (= actor.organization-id project.client.organization-id)
               (has-role actor "project-manager"))))

(view project-detail
  (subject (entity project) (parameter project-id))   ; parameter p carries nominal type p
  (scope project-aggregate)                            ; optional boundary (§14)
  (query
    (one project (where (= project.id project-id))
                 (authorized-by project-reader))
    (include project.client)                           ; the loaded set (§15)
    (lookup client-summary (through task.project.client)))
  (layout                                              ; order preserved verbatim
    (detail
      (show project.name)
      (list client.projects ...)
      (action edit-project-name)
      (navigate (to project-detail) (with (project-id project.id))))))

(action edit-project-name
  (subject project)
  (input (field name (type string) (validate (required))))
  (authorize (policy project-name-editor))   ; REQUIRED with effects — deny-by-default
  (effect (set project.name input.name))
  (ensure (valid project)))
```

Layout paths are verified in layers (§14): a structurally
reachable path is still rejected when it is outside the query's
loaded set (`manifest.view.relation-not-loaded`, listing the
available paths), crosses the declared aggregate
(`manifest.view.aggregate-boundary`), or reaches a field a
projection does not expose (`manifest.projection.not-exposed`).
Navigation is checked module-wide: target view, parameter
completeness, and argument types. An action with effects and no
`(authorize ...)` is a compile error — no policy means denied
(design §36.1).

## The dependency vocabulary (Phase 5)

```lisp
(entity order
  (field total (type (money JPY))
    (derive (sum (children items subtotal)))   ; member-field sum
    (materialize (consistency immediate)))     ; requires derive; immediate must
  (field tax (type (money JPY))                ;   stay inside the aggregate
    (derive (* total tax-rate)))               ; Money<C> × Percentage → Money<C>
  (field item-count (type integer)
    (derive (count order.items))))             ; membership count
```

Derived values declare their source (§36.6): a `(set ...)` effect
targeting a derived field is `manifest.derive.not-writable`, a
`materialize` without a `derive` is rejected, and derivations are
type-checked against the field. The dependency graph is built from
the declarations; **circular derivations are compile errors**
(§36.8, `manifest.derive.circular`). Consumers read the update
semantics from two pure functions over the compiled `Module`:
`derivedUpdateOrder` (topological, dependencies first) and
`updatePlanFor(module, {entity, field})` — the §13 chain
`order-item change → total → tax` (use `field: "*"` for a
membership change).

The three-layer documentation of the family (design §41) is the
three package READMEs — the
[syntax reference](../plgg-ir-syntax/README.md), the
[language-framework guide](../plgg-ir-language/README.md), and
this manifest-language guide — plus the comprehensive
[plgg-ir guide](../../docs/plgg-ir/guide.md).

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

## Composing onto the vocabulary

The domain vocabulary is also exported as one composable dialect,
`manifestDialect` (design §24's `domainDialect`; `manifestLanguage`
is derived from it, so the two cannot drift). A consumer with its
own forms composes them ALONGSIDE it — `plgg-ir-language`'s
`mapDialect` lifts the dialect to the consumer's node type:

```ts
const language = compose(
  mapDialect((m: Module): PortalNode => m)(manifestDialect),
  viewDialect, // the consumer's own forms
);
```

One checked language: a document may use both vocabularies, a
consumer form's reference to a domain-declared entity resolves
through the composition's scope, and a name registered twice is a
composition error. A composed dialect adds forms — it never
extends a domain type; the vocabulary stays closed (design §36.3)
and the `view`/`policy` definitions stay in the consumer (§25).

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root `CLAUDE.md`).
- Runtime dependencies are `plgg`, `plgg-ir-syntax`, and
  `plgg-ir-language` only.
- After editing a `file:`-linked dependency's source, rebuild its
  `dist` or this package won't see new exports.
