# plgg-domain

The **durable-core / sacrificial-shell** spine (roadmap decision **D18**),
built from scratch on [plgg](../plgg/), [plgg-sql](../plgg-sql/), and
[plgg-db-migration](../plgg-db-migration/). Part of the
[plgg monorepo](../../README.md).

In the LLM / "vibe-coding" era, application code is cheap and disposable —
regenerated on demand. So plgg treats the **application shell as sacrificial**
and the **data, domain model, and external contracts as the durable core**.
This package makes that boundary crisp and **machine-checkable**: a regenerated
shell provably cannot drift from the core, because it is *derived out of it*.

## The idea

You author **one** `Domain` — a record of caster-typed `Entity` declarations —
and everything downstream is derived from it:

- **`schemaOf`** — derive the SQLite schema as a `plgg-db-migration` migration,
  so the generated schema joins the append-only migration history.
- **`assertPersistedSchema`** — a schema-compatibility **boot gate**: a freshly
  generated app started against an existing database asserts, through casters,
  that the persisted schema satisfies the current `Domain` (`Ok`), is merely
  behind (`Lag`, with a runnable forward migration), or conflicts
  irreconcilably (`Drift`, a typed value matched exhaustively) — in which case
  it refuses to boot rather than corrupt the durable store.
- **`decodeEntity` / `encodeEntity`** — the runtime row boundary: persisted rows
  always re-enter the domain parse-don't-validate.
- **`exportDomain` / `importDomain`** — a canonical, **code-independent** export
  and re-import, so the app can always be discarded and regenerated.
- **`DomainManifest`** — a provenance manifest (domain fingerprint, derivation
  version, schema head) recording which generation produced a running instance.
- **Derivation seams** (`toDeliveryShape`, and the `ToContentModel` /
  `ToResourceDeclaration` / `ToMcpToolSchema` interfaces) — the pure functions a
  regenerated shell's delivery API, content models, UI declarations, and MCP
  tools are re-derived from.

## Example

`example.ts` walks the whole D18 flow: author a `Domain`, derive + apply the
schema, boot against a matching store (`Ok`), seed + export + re-import into a
fresh database (round-trip with no loss), and boot against an **incompatible**
store (refuse, with a clear typed reason).

## Scripts

- `scripts/tsc-plgg-domain.sh` — type-check.
- `scripts/test-plgg-domain.sh` — unit specs (≥91% coverage gate), run against
  real `node:sqlite`.
