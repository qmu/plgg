# The plgg-ir Guide

The `plgg-ir` package family is a restricted, typed, Lisp-style
intermediate-representation platform for the plgg ecosystem. An
LLM agent generates a **Domain Manifest** — a closed-vocabulary
S-expression describing entities, relations, validation,
authorization, views, actions, and derived values — and the
toolchain statically verifies it and normalizes it into a
deterministic canonical IR that consumers such as `plggmatic`
interpret to generate a standard Web application.

The purpose is a **safe semantic boundary between probabilistic
AI generation and deterministic behavior**: the AI never emits
arbitrary TypeScript/SQL/authorization code, only an expression
the compiler can accept or reject with precise, machine-
correctable diagnostics.

```text
LLM-generated source
      ↓  parse            (plgg-ir-syntax)
Position-aware syntax tree
      ↓  expand → analyze → normalize   (plgg-ir-language)
      ↓  domain verification            (plgg-ir-manifest)
Canonical Domain Manifest IR  —  (plgg-ir 1 ...)
      ↓  interpret          (plggmatic and other consumers)
UI / API / validation / authorization / persistence / navigation
```

Full design rationale (43 sections):
[`.workaholic/missions/build-the-plgg-ir-package-family/design.md`](../../.workaholic/missions/build-the-plgg-ir-package-family/design.md).
Per-package references: [plgg-ir-syntax](../../packages/plgg-ir-syntax/README.md) ·
[plgg-ir-language](../../packages/plgg-ir-language/README.md) ·
[plgg-ir-manifest](../../packages/plgg-ir-manifest/README.md).

A second dialect on the same language layer verifies **argumentation
structures** rather than domain models — see the
[plgg-ir-thesis guide](./thesis-guide.md).

---

## 1. The package family

```text
plgg ── plgg-parser ── plgg-ir-syntax ── plgg-ir-language ── plgg-ir-manifest ── (plggmatic)
```

| Package | Responsibility | Does NOT know about |
| --- | --- | --- |
| `plgg-ir-syntax` | S-expression source structure: tokenizer, parser, printer, source positions, syntax diagnostics | any domain meaning — `entity` is just a symbol |
| `plgg-ir-language` | reusable static machinery: forms, operators, scopes, type checking, diagnostics, expansion, normalization, dialect composition | the Domain Manifest vocabulary |
| `plgg-ir-manifest` | the Domain Manifest dialect, its verification passes, and the canonical `Module` model | any consumer technology (no React, SQL, URLs) |

Dependencies are strictly one-directional; lower layers never
import upper ones (audited: no upward import exists). Everything
follows the house style: `Option` not null, `Result` not throw,
exhaustive `match`, no `as`/`any`/`ts-ignore`.

The one public entry point most consumers need:

```ts
import { compileManifest } from "plgg-ir-manifest";

const result = compileManifest(source);
// Result<
//   { module: Module; canonical: string },
//   ReadonlyArray<SemDiagnostic>
// >
```

Any diagnostic makes the whole result an `Err` carrying **every**
diagnostic found in one run — the shape LLM correction loops
consume. Nothing in the family ever throws on malformed input.

---

## 2. Layer 1 — the syntax (`plgg-ir-syntax`)

### Lexical structure

The grammar is closed and regular by design (an unknown character
is a compile error, never skipped silently):

| Token | Form |
| --- | --- |
| Symbol | ASCII letters, digits, and `-+*/<>=!?._` (e.g. `length-between`, `>=`, `task.project.client`) |
| Number | `-?digits(.digits)?([eE][+-]?digits)?`, must be finite; a digit-leading lexeme failing this is `syntax.invalid-number` |
| Boolean | `true` / `false` |
| String | double-quoted; closed escape set `\"` `\\` `\n` `\t` `\r`; unknown escapes are `syntax.invalid-escape` |
| List | `( ... )`, nested |
| Comment | `;` to end of line (trivia, never part of the tree) |

### API

- `parseSexps(source)` →
  `Result<ReadonlyArray<Sexp>, ReadonlyArray<SyntaxDiagnostic>>`.
  Every node carries a `SourceRange` (`offset` 0-based, `line`/
  `column` 1-based, end exclusive). Lexing and reading **recover**
  (skip + diagnose), so one run reports every problem.
- `printSexp` / `printSexps` — the canonical printer. A list of
  only atoms prints inline (`(length-between 1 200)`); otherwise
  the leading atom run stays on the head line and every remaining
  element gets its own line, indented two spaces.
- `sexpEquals` — structural equality ignoring ranges; the
  round-trip law is stated with it.
- `tokenize(source)` — the underlying lexer, exposed for tooling.

### Laws (property-tested)

```text
parse(print(parse(x))) = parse(x)       (round trip)
printing is deterministic               (same tree → same text)
```

Syntax diagnostic codes: `syntax.unexpected-character`,
`syntax.unterminated-string`, `syntax.invalid-escape`,
`syntax.invalid-number`, `syntax.unterminated-list`,
`syntax.unexpected-close-paren`.

---

## 3. Layer 2 — the framework (`plgg-ir-language`)

The machinery a restricted IR dialect is made of. The manifest is
its first dialect; the framework itself defines no domain word.

### Semantic types (`SemType`)

- **Primitives**: `boolean`, `integer`, `decimal`, `string`,
  `date`.
- **Nominal domain types**: `client-id ≠ organization-id` even if
  both are stored as strings — expressing a requirement in the
  type vocabulary doubles as a consistency check on the
  requirement.
- **Parameterized types**: `(money JPY) ≠ (money USD)`.
- `isAssignable` is structural equality plus the single widening
  `integer → decimal`.

### Operators

A closed registry. Each operator's typing rule is a plain
function `(argTypes, range) → Result<SemType, diagnostics>`:
`fixedSignature(params, result)` covers the common case (arity +
per-operand assignability, accumulating every mismatch with
expected/actual context); polymorphic rules such as
`Money<C> × Percentage → Money<C>` are written as branching — no
unification engine exists or is needed.

### Forms and two-phase analysis

A dialect registers `FormDef<N>` values over its own node type
`N`. Analysis is two-phase so **forward references resolve** (an
entity may target one declared later):

1. `declare(form)` — pass 1, contributes kinded bindings to the
   root scope (duplicates are diagnosed with a "first declared
   here" related location).
2. `analyze(form, ctx)` — pass 2, runs with the full scope and
   two recursion seams: `ctx.checkExpr` (expression typing) and
   `ctx.analyzeForm` (nested forms).

Bindings are **kinded** (`"entity"`, `"field"`, …): a reference
of one kind never resolves to a binding of another.

### The pipeline

```ts
compileSource(language)(source)
// parse → expand → analyze → normalize → canonical print
```

- **Expansion** rewrites registered shorthand bottom-up before
  analysis (with a depth bound against self-producing expanders),
  so the canonical form never contains sugar.
- **Normalization** applies registered total `Sexp → Sexp` rules
  in order; the composed pass is idempotent
  (`normalize(normalize(x)) = normalize(x)`, property-tested) and
  equivalent sources produce identical canonical text.
- **Dialect composition** (`compose(...)`) concatenates
  registries; a name registered twice is a composition error.

### Diagnostics (`SemDiagnostic`)

The family-wide error model: stable machine `code`, severity,
message, `SourceRange`, optional expected/actual context, and
related locations. Every pass **accumulates** — the checker
reports all operand errors, all form errors, all verification
errors in one run. Framework codes: `language.invalid-form`,
`language.unknown-form`, `language.unknown-operator`,
`language.unknown-name`, `language.duplicate-name`,
`language.arity-mismatch`, `language.type-mismatch`,
`language.invalid-expression`, `language.untyped-reference`,
`language.expansion-depth`.

---

## 4. Layer 3 — the Domain Manifest (`plgg-ir-manifest`)

### The root

```lisp
(plgg-ir 1                       ; version is REQUIRED (currently 1)
  (module <name>
    <entity | aggregate | projection | policy | view | action> ...))
```

Exactly one root per source; an unsupported version is
`manifest.root.unsupported-version`. Unknown module children,
entity clauses, field clauses, validation rules, and layout forms
are all compile errors — the vocabulary is closed at every level.

### Entities, fields, types, validation

```lisp
(entity client
  (table clients)                          ; optional persistence mapping
  (access (read project-reader)            ; §5 below
          (update name project-name-editor))
  (field name
    (type string)                          ; primitive | nominal | (money JPY)
    (column client_name)                   ; optional persistence mapping
    (validate
      (required)
      (max-length 254)
      (length-between 1 200)
      (required-when (= customer-type "corporation"))))
  (relation projects
    (target project)
    (cardinality many)                     ; one | many, required
    (required)                             ; optional
    (inverse client))                      ; optional, verified to point back
  (invariant (before starts-at ends-at)))  ; cross-field, boolean-typed
```

- Field/relation names are unique per entity; entity names are
  unique per module (forward references between entities work).
- `required-when` conditions and `invariant`s type-check against
  the entity's own fields and must be boolean.
- A declared `inverse` must name a relation on the target that
  points back; mutually declared inverses must reference each
  other (`manifest.relation.bad-inverse` otherwise).

The expression operators available everywhere:
`and or not = >= <= > < before + * has-role`, with
`= : T × T → boolean` (same semantic type on both sides),
`+ : Money<C> + Money<C> → Money<C>` or numeric,
`* : Money<C> × Percentage → Money<C>` or numeric, and
`has-role : actor × string → boolean`.

### Aggregates

```lisp
(aggregate project-aggregate
  (root project)
  (members task)
  (consistency immediate))    ; immediate | eventual
```

Roots and members must be declared entities, an entity belongs to
at most one aggregate, and every member must be structurally
related to its root. Aggregates are the consistency boundary that
views (`scope`) and immediate materialization respect.

### Projections, policies, views, actions

```lisp
(projection client-summary
  (from client)
  (fields client.id client.name))   ; the ONLY fields a lookup exposes

(policy project-name-editor
  (allows (and (= actor.organization-id project.client.organization-id)
               (has-role actor "project-manager"))))

(view project-detail
  (subject (entity project) (parameter project-id))
  (scope project-aggregate)                       ; optional boundary
  (query
    (one project
      (where (= project.id project-id))
      (authorized-by project-reader))
    (include project.client)                      ; the loaded set
    (lookup client-summary (through task.project.client)))
  (layout                                          ; order preserved verbatim
    (detail
      (show project.name)
      (section tasks
        (list project.tasks
          (show task.name)))
      (action edit-project-name)
      (navigate (to client-detail)
        (with (client-id project.client.id))))))

(action edit-project-name
  (subject project)
  (input (field name (type string) (validate (required))))
  (authorize (policy project-name-editor))         ; REQUIRED with effects
  (effect (set project.name input.name))
  (ensure (valid project)))
```

Conventions to know:

- **A parameter named `p` carries the nominal type `p`** — so
  `(where (= project.id project-id))` type-checks because
  `project.id` was declared `(type project-id)`. The same
  convention types `actor.<f>` as nominal `<f>`.
- **Layout paths are verified in layers** (the design §14
  answer). A path like `task.project.client.invoices` that is
  structurally reachable is still rejected as:
  - `manifest.view.relation-not-loaded` when its relation prefix
    is not in the query's loaded set (the message lists the
    available paths),
  - `manifest.view.aggregate-boundary` when the first unloaded
    hop leaves the view's declared aggregate,
  - `manifest.projection.not-exposed` when reached through a
    lookup alias whose projection does not list the field.
- `(show ...)` needs a scalar value path, `(list ...)` a
  collection path (`manifest.view.list-scalar-misuse` otherwise);
  list children are rooted at the element entity's alias.
- **Navigation is semantic** — a view name and typed arguments,
  never a URL. It is verified module-wide (views may navigate
  forward): the target must exist, every target parameter must be
  supplied, no extras, and each argument's type must equal the
  parameter's nominal type.
- **Deny-by-default** (design §36.1): an action with `(effect
  ...)` and no `(authorize (policy ...))` is
  `manifest.action.missing-authorize`. Policies must exist and
  their `allows` must type to boolean. Effects may only set
  direct fields of the subject, with assignable value types.

### Derived values and update ordering

```lisp
(entity order
  (field total (type (money JPY))
    (derive (sum (children items subtotal)))
    (materialize (consistency immediate)))
  (field tax (type (money JPY))
    (derive (* total tax-rate)))
  (field item-count (type integer)
    (derive (count order.items))))
```

- Three derivation shapes: `(count <collection-relation>)` →
  integer; `(sum (children <relation> <member-field>))` over a
  numeric/money member; or a plain typed expression over the
  entity's reachable values. All are type-checked against the
  field.
- `materialize` requires `derive` — materialized fields must
  identify their source (§36.6). Derived fields are **never
  writable**: an action effect targeting one is
  `manifest.derive.not-writable`.
- The dependency graph is built from the declarations. **Circular
  derivations are compile errors**
  (`manifest.derive.circular`). Immediate materialization whose
  dependencies leave the owner's aggregate is
  `manifest.derive.incompatible-consistency`; `eventual` may
  cross freely.
- Consumers never hand-write update order; they read it:

```ts
import {
  derivedUpdateOrder, // all derived fields, dependencies first
  updatePlanFor,      // the §13 chain for one change
  fieldRef,
} from "plgg-ir-manifest";

updatePlanFor(module, fieldRef("order-item", "subtotal"));
// → [order.total, order.tax]
updatePlanFor(module, fieldRef("order-item", "*")); // membership change
// → [order.total, order.item-count, order.tax]
```

### The canonical IR

`compileManifest` returns the resolved `Module` model (entities →
fields/relations/derivations, aggregates, projections, policies,
views → query/layout trees, actions) plus `canonical`, the
canonical text:

- **Deterministic**: clause lists sort by a fixed rank then
  printed text (entities before aggregates before projections/
  policies/views/actions; `table → access → field → relation →
  invariant` inside entities; and so on). Aggregate members and
  projection fields sort as atoms.
- **Meaning is never reordered**: expression operand order and
  layout child order pass through verbatim.
- **Equivalent sources normalize to identical canonical text**,
  and compiling canonical output is a fixpoint
  (`compile(compile(x).canonical).canonical =
  compile(x).canonical`) — property-tested. This is what enables
  stable caching, semantic diffing, content hashing, and safe LLM
  correction loops.

### Diagnostic codes (manifest layer)

| Area | Codes |
| --- | --- |
| root/module | `manifest.root.malformed`, `manifest.root.unsupported-version`, `manifest.module.malformed`, `manifest.module.unknown-form` |
| entity/field | `manifest.entity.malformed`, `manifest.entity.unknown-form`, `manifest.entity.duplicate-member`, `manifest.field.malformed`, `manifest.field.unknown-form`, `manifest.field.bad-validation` |
| relation/aggregate | `manifest.relation.malformed`, `manifest.relation.unknown-target`, `manifest.relation.bad-inverse`, `manifest.aggregate.malformed`, `manifest.aggregate.unknown-entity`, `manifest.aggregate.duplicate-member`, `manifest.aggregate.unrelated-member` |
| paths/views | `manifest.path.unknown`, `manifest.view.malformed`, `manifest.view.unknown`, `manifest.view.unknown-layout-form`, `manifest.view.relation-not-loaded`, `manifest.view.aggregate-boundary`, `manifest.view.list-scalar-misuse`, `manifest.view.missing-parameter`, `manifest.view.unknown-parameter` |
| projections/policies | `manifest.projection.malformed`, `manifest.projection.unknown`, `manifest.projection.not-exposed`, `manifest.policy.malformed`, `manifest.policy.unknown` |
| actions | `manifest.action.malformed`, `manifest.action.unknown`, `manifest.action.missing-authorize`, `manifest.action.bad-effect` |
| derivations | `manifest.derive.malformed`, `manifest.derive.circular`, `manifest.derive.not-writable`, `manifest.derive.incompatible-consistency` |
| expressions | `manifest.expression.non-boolean` (plus the `language.*` and `syntax.*` codes from the lower layers) |

---

## 5. Safety principles, as implemented

| Principle (design §36) | Enforcement |
| --- | --- |
| Deny by default | action effects without a policy → compile error; `authorized-by`/`authorize`/`access` references verified |
| No arbitrary evaluation | there is no `eval`, I/O, or user-defined function anywhere in the vocabulary |
| Closed vocabulary | unknown forms/operators/clauses/rules at every level are compile errors |
| Typed references | kinded bindings; nominal domain types stay distinct; parameters/actor attributes carry name-as-type |
| Explicit boundary crossing | query scope (include), projections (lookup), and aggregate scope each have their own diagnostic |
| Derived values declare sources | `materialize` requires `derive`; derived fields are not writable |
| One source of truth | one `derive` per field; effects rejected on derived fields |
| Cycles are errors | derivation cycles rejected; no fixed-point escape hatch |
| Consumer independence | no component names, SQL, or URLs exist in the vocabulary; navigation and inputs are semantic |

## 6. Known deviations and deferred items

- `has-role` takes a **string** role (`(has-role actor
  "project-manager")`) where design §10 sketched a bare symbol —
  a closed-vocabulary compromise.
- The grouped `(source ...)` persistence clause from design §28
  is not implemented; persistence mapping is `(table t)` on
  entities and `(column c)` on fields.
- Guide-site pages are not yet wired; this document and the three
  package READMEs are the published documentation.
- Wiring `plggmatic` to interpret the canonical `Module` is the
  mission's declared follow-on, tracked outside this family.

## 7. Verifying the family

```sh
./scripts/test-plgg-ir-syntax.sh     # 43 tests
./scripts/test-plgg-ir-language.sh   # 62 tests
./scripts/test-plgg-ir-manifest.sh   # 70 tests, incl. the §39 scenario
```

Each package enforces >90% coverage on statements, branches,
functions, and lines through `plgg-test --coverage`; all three
run inside `./scripts/check-all.sh`. The design §39 acceptance
scenario — clients/projects/tasks/invoices with authorization,
aggregate scope enforcement, and a derived task count — lives in
`packages/plgg-ir-manifest/src/domain/usecase/acceptance39.spec.ts`.
