---
created_at: 2026-07-04T14:30:31+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, DB]
effort:
commit_hash:
category:
depends_on: []
---

# Durable-core / sacrificial-shell boundary: a domain-model spine that derives schema, declarations, API, and MCP tools

## Overview

This is the foundational ticket for the roadmap's sacrificial-architecture
pillar (decision **D18** in
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`). D18 states:
in the LLM/"vibe-coding" era, application code is cheap and disposable —
on-demand-generated, yearly or monthly full-scratch-rewritten — so plggmatic
("Prag") treats the **application shell as sacrificial** and the **data,
domain model, and external contracts as the durable core**. The framework's
job is to make that boundary crisp and **machine-checkable**, so a
regenerated shell cannot endanger what is behind the line, and the durable
core carries everything a regenerator needs to rebuild a correct shell.

This ticket builds the **durable core** as a single authored artifact — a
`Domain` definition assembled from plgg's existing caster vocabulary — and the
**derivation spine** that produces, from that one source: the SQLite schema +
migrations, the typed content models (ticket 17), the read-only delivery API
shape (ticket 16), the plggmatic resource/action declarations (ticket 9), and
later the MCP tool schemas (ticket 26). Regeneration of the sacrificial shell
then becomes *re-derivation*, and the shell provably cannot drift from the
core because it is generated out of it.

It also delivers the two guarantees that make throwing away the app safe:
a **schema-compatibility boot gate** (a freshly generated app, started against
an existing database, asserts through casters that the persisted schema
satisfies the current `Domain`, or fails loudly at startup) and a **canonical,
code-independent data export** (the app can always be exported and re-imported,
so it can always be regenerated). A **provenance manifest** records which
generation produced a running instance, from which `Domain`/derivation version,
against which schema version.

This is the D18 flagship; **D4** (git-primary content, SQLite as a *derived,
rebuildable* index) is reframed by the roadmap as the first concrete instance
of this same boundary (durable content, sacrificial index).

Sequencing (hybrid, per the roadmap): this spine is a hard prerequisite only
for the domain/data-shaped tickets — 9 (scheduler), 16 (content index/API),
17 (content models), 18 (accounts). The design-system track (tickets 1–8:
tokens → effects → theme rewrite) does **not** depend on it, so the
theme-first runnable demo (D3) still lands early.

## Policies

- `workaholic:implementation` / `policies/quality.md` — the core doctrine here
  is that gaps in domain reasoning must be machine-checkable early; the
  derivation spine makes the durable/sacrificial boundary a `tsc`- and
  caster-enforced property rather than a convention, which is exactly what
  makes LLM-regenerated shells trustworthy.
- `workaholic:operation` / `policies/recovery.md` — the schema-compat boot
  gate and the canonical export are recovery guarantees: data survives any
  app generation, and an incompatible shell refuses to start rather than
  corrupting the durable store.

## Key Files

- `packages/plgg/src/Grammaticals/Brand.ts`, `RefinedBrand.ts` — the branding
  and refinement combinators that domain entities are built from.
- `packages/plgg/src/Flowables/cast.ts` — the parse-don't-validate caster
  entry point; the boundary at which the durable core is enforced.
- `packages/plgg/src/Atomics/` (Int.ts, Num.ts, Bool.ts, Time.ts, Bin.ts,
  SoftStr.ts, BigInt.ts) — the branded primitive column types entities compose.
- `packages/plgg/src/Abstracts/Servables/Castable.ts` — the Castable interface a
  `Domain` field type must satisfy.
- `packages/plgg-sql/src/Db/` — the driver-agnostic `Db` seam (all/run/
  execScript/begin/commit/rollback) the schema derivation and boot gate use.
- `packages/plgg-sql/src/Sql/` — the forgery-proof `Sql` tagged template used to
  emit DDL and the introspection queries (PRAGMA table_info / sqlite_master).
- `packages/plgg-sql/src/Mapping/usecase/` — `decodeRow(s)` typed row mapping the
  derivation reuses so persisted rows re-enter the domain through casters.
- `packages/plgg-db-migration/src/domain/model/` — the migration model
  (schema_migrations ledger, up/down, sqlite dialect) the derived schema emits
  into; the append-only migration history is part of the durable core.
- `packages/plgg-db-migration/src/domain/usecase/` — the migrator the boot gate
  invokes when the persisted schema lags the `Domain`.
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — D18 (and D4).

## Related History

- plgg-sql and plgg-db-migration were both built from scratch in the
  vendor-neutrality endgame (see `.workaholic/stories/`); this ticket composes
  them into a domain-first spine rather than adding a dependency.
- Ticket `20260704143017-frontmatter-yaml-subset-and-content-models.md` (D8)
  defines caster-backed content models; this ticket generalizes that idea from
  "content" to the whole `Domain`, and 17 is re-based to consume the spine's
  `Domain` type instead of defining its own model shape.
- Ticket `20260704143009-declarative-ui-vocabulary-and-scheduler-core.md` (D1)
  defines the plggmatic declaration; this ticket supplies the `Domain` those
  declarations are derived from, closing the "declaration is durable, UI is
  sacrificial" loop.
- D4 (roadmap) — git-primary content + derived SQLite index — is the existing,
  shipping instance of this boundary; this ticket does not change it, it names
  the general pattern it already follows.

## Implementation Steps

1. Design step (types first, reviewed before implementation): specify a
   `Domain` construct — a record of named `Entity` declarations, each a set of
   caster-typed fields (reusing Atomics + Brand/RefinedBrand), field
   persistence attributes (primary key, nullability, uniqueness, references),
   and entity-level invariants. `Domain` is authored once and is the single
   durable source. Write the type design into the ticket's design note and get
   it reviewed against the plggmatic-example and plggpress content model as the
   two reference consumers.
2. Decide and record the home package for the spine (candidates: a new
   `plgg-domain` package, or an entrypoint inside `plgg`/`plgg-sql`). If a new
   package: full wiring per conventions — package.json, tsconfig.json,
   .prettierrc.json (printWidth 50), bundle.config.ts, plgg-test.config.json
   **gated ≥90 from day one** (D14), README.md, src/index.ts, plus
   `scripts/npm-install.sh`, `scripts/build.sh` (exact
   `cd $REPO_ROOT/packages/<name> && npm run build` line — publish order is
   sed-derived from its shape), `scripts/check-all.sh`, and per-package
   `scripts/test-<name>.sh` / `scripts/tsc-<name>.sh`.
3. Schema derivation: `schemaOf(domain): Sql` — emit CREATE TABLE DDL for each
   Entity from its fields, mapping each branded field type to a SQLite column
   type + constraints. Emit as a plgg-db-migration migration so the derived
   schema joins the append-only history rather than being applied ad hoc.
4. Schema-compat boot gate: `assertPersistedSchema(db, domain): Result<Ok, Mismatch>`
   — introspect the live database (PRAGMA table_info / sqlite_master via the
   `Sql` template over the `Db` seam), and verify every Entity/field/constraint
   in `domain` is satisfied. On lag, return the migration to run; on
   irreconcilable drift, return a typed `Mismatch` so the app fails at startup,
   not at runtime. No `as`/`any` — mismatches are data, matched exhaustively.
5. Row boundary: provide `decodeEntity`/`encodeEntity` built on
   `plgg-sql` `decodeRow` and the entity casters, so persisted rows always
   re-enter the domain through parse-don't-validate. This is the runtime half of
   the boundary the boot gate checks statically.
6. Canonical export/import: `exportDomain(db, domain)` → a code-independent,
   schema-versioned dump (JSON per entity + a manifest), and `importDomain` →
   restore into a fresh database via the derived schema. This is the
   data-portability guarantee that lets the app be discarded. (Object-storage
   layout export is scoped to ticket 23's media work; this ticket covers the
   relational core and names the object-storage extension in Considerations.)
7. Provenance manifest: `DomainManifest` capturing domain version hash,
   derivation version, and schema-migration head; written on boot and included
   in the export so any generation is auditable and rollback-able.
8. Derivation seams for downstream tickets (interfaces only here; consumers
   implement their half): `toContentModel` (ticket 17), `toDeliveryShape`
   (ticket 16), `toResourceDeclaration` (ticket 9), `toMcpToolSchema`
   (ticket 26). Ship the interfaces and one worked example (a tiny `Domain`
   derived through `schemaOf` + boot gate + export round-trip) as the runnable
   proof.
9. Re-base the four dependent tickets (done as part of this ticket's landing,
   not their implementation): 9, 16, 17, 18 add this ticket to `depends_on`
   and reference the `Domain`/derivation seam they consume.

## Quality Gate

**Acceptance criteria**
- A `Domain` can be authored from casters, and `schemaOf` emits a migration
  that creates a working SQLite schema for it.
- `assertPersistedSchema` returns `Ok` for a matching database, a runnable
  migration for a lagging one, and a typed `Mismatch` (not a throw, not `any`)
  for irreconcilable drift; a demo app started against an incompatible database
  refuses to boot with a clear message.
- `exportDomain` → `importDomain` round-trips data into a fresh database with
  no loss, proving code-independent portability.
- The derivation seam interfaces (`toContentModel` / `toDeliveryShape` /
  `toResourceDeclaration` / `toMcpToolSchema`) exist and compile, with the one
  worked example wired end-to-end.
- No `as` / `any` / `ts-ignore`; Option/Result/exhaustive `match`; Prettier
  printWidth 50; ≥90% coverage on the new/changed package.

**Verification method**
- `scripts/tsc-<pkg>.sh` (and `scripts/tsc-plgg-sql.sh`,
  `scripts/tsc-plgg-db-migration.sh` for touched siblings) — green.
- `scripts/test-<pkg>.sh` — unit specs for `schemaOf`, `assertPersistedSchema`
  (match/lag/drift cases), the export/import round-trip, and the boot-gate
  refusal path; coverage ≥90.
- `scripts/check-all.sh` — fresh full rebuild green (unmasks dependent-package
  type drift per the check-all doctrine).

**Gate**
- check-all green; the export/import round-trip and the boot-gate-refuses-on-
  drift behaviors are both demonstrated by a runnable example, not only asserted
  in prose.

## Considerations

- Scope discipline: this ticket ships the **spine and guarantees**, not the
  downstream derivations themselves — tickets 9/16/17/26 implement their half
  of each seam. Resist pulling their work forward.
- Object-storage layout portability (the "files in object storage" half of the
  durable core) is named here but implemented with ticket 23's media work;
  record the export-format extension point so it slots in without rework.
- Determinism: `schemaOf` and the derivations must be pure and stable
  (same `Domain` → same output) so regeneration is reproducible — a property
  the tests should pin.
- Revisit trigger: if guest web editing (ticket 22) forces SQLite-primary
  content (the D4 revisit trigger), the durable core grows to include the
  content entities directly; the spine is designed to absorb that without a
  boundary redraw.
- This deliberately generalizes ticket 17's caster-backed content model to the
  whole domain; make sure 17 consumes the spine rather than re-deriving, to
  avoid two model shapes.
