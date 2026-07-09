# plgg-domain

The **durable-core / sacrificial-shell** spine
(roadmap decision D18), built from scratch on
[plgg](/packages/plgg/),
[plgg-sql](/packages/plgg-sql), and
[plgg-db-migration](/packages/plgg-db-migration).

In the LLM era application code is cheap and
disposable — regenerated on demand. plgg therefore
treats the **application shell as sacrificial** and
the **data, domain model, and external contracts as
the durable core**. This package makes that boundary
machine-checkable: a regenerated shell provably cannot
drift from the core, because it is _derived out of
it_.

## Writing an app with it

You author **one** `Domain` — a record of caster-typed
`Entity` declarations — and everything downstream is
derived. From the package's runnable example
(`packages/plgg-domain/example.ts`, abbreviated):

```typescript
import {
  asDomain,
  schemaOf,
  assertPersistedSchema,
  exportDomain,
  importDomain,
  describeMismatch,
  schemaOk$,
  schemaLag$,
  schemaDrift$,
} from "plgg-domain";

const spec: DomainSpec = {
  name: "blog",
  entities: [
    {
      name: "users",
      fields: [
        {
          name: "id",
          kind: "int",
          primaryKey: true,
        },
        {
          name: "email",
          kind: "text",
          unique: true,
        },
      ],
    },
  ],
};

const report = (check: SchemaCheck): string =>
  match(check)(
    [schemaOk$(), () => "OK"],
    [
      schemaLag$(),
      () => "LAG (migration returned)",
    ],
    [
      schemaDrift$(),
      ({ content }) =>
        `DRIFT — ${content.mismatches
          .map(describeMismatch)
          .join("; ")}`,
    ],
  );
```

The example walks the whole flow: author a `Domain`,
derive and apply the schema, boot against a matching
store (`Ok`), seed + export + re-import into a fresh
database (round-trip with no loss), and boot against
an **incompatible** store — refuse, with a clear typed
reason. Run it with
`node --experimental-strip-types packages/plgg-domain/example.ts`.

## Vocabulary

- **`asDomain`** — validate a `DomainSpec` into a
  typed `Domain` (`unknown` →
  [`Result`](/concepts/result)).
- **`schemaOf`** — derive the SQLite schema as a
  [plgg-db-migration](/packages/plgg-db-migration)
  migration, so the generated schema joins the
  append-only migration history.
- **`assertPersistedSchema`** — the boot gate: the
  persisted schema satisfies the current `Domain`
  (`Ok`), is merely behind (`Lag`, with a runnable
  forward migration), or conflicts irreconcilably
  (`Drift`) — matched exhaustively; on `Drift` the
  app refuses to boot rather than corrupt the store.
- **`decodeEntity` / `encodeEntity`** — the runtime
  row boundary: persisted rows always re-enter the
  domain parse-don't-validate.
- **`exportDomain` / `importDomain`** — a canonical,
  code-independent export and re-import, so the app
  can always be discarded and regenerated.
- **`DomainManifest`** — a provenance manifest
  (domain fingerprint, derivation version, schema
  head) recording which generation produced a running
  instance.
- **Derivation seams** — `toDeliveryShape` and the
  `ToContentModel` / `ToResourceDeclaration` /
  `ToMcpToolSchema` interfaces: the pure functions a
  regenerated shell's delivery API, content models,
  UI declarations, and MCP tools are re-derived from.

## Why it exists

plgg's type-driven, no-escape-hatch style is what
makes regenerated code trustworthy — but only if the
regenerated shell cannot silently disagree with the
data it serves. plgg-domain closes that loop: the
schema is derived (never hand-written twice), the boot
gate turns drift into a typed refusal instead of
corruption, and the derivation seams mean the
[plggpress](/packages/plggpress) delivery API, the
plgg-ui declarations, and the MCP tool schemas
can all be re-derived from the same authored core.
Unit specs run against real `node:sqlite`.
