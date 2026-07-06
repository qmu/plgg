// Runnable proof of the durable-core / sacrificial-shell boundary (D18).
// A single authored `Domain` derives the schema, boots against a store, is
// exported and re-imported into a fresh database, and — the safety guarantee —
// refuses to boot against an incompatible store. Run with:
//   node --experimental-strip-types packages/plgg-domain/example.ts
import {
  none,
  some,
  isOk,
  match,
  matchResult,
} from "plgg";
import { runScript } from "plgg-sql";
import { asVersion } from "plgg-db-migration";
import {
  asDomain,
  DomainSpec,
  schemaOf,
  assertPersistedSchema,
  exportDomain,
  importDomain,
  toDeliveryShape,
  describeMismatch,
  schemaOk$,
  schemaLag$,
  schemaDrift$,
  Mismatch,
  SchemaCheck,
} from "plgg-domain/index";
import { openSqliteDb } from "plgg-domain/testkit/sqliteDb";

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
    [schemaLag$(), () => "LAG (migration returned)"],
    [
      schemaDrift$(),
      ({ content }) =>
        `DRIFT — ${content.mismatches
          .map((m: Mismatch) =>
            describeMismatch(m),
          )
          .join("; ")}`,
    ],
  );

const main = async (): Promise<void> => {
  const built = asDomain(spec);
  if (!isOk(built)) {
    console.error("invalid domain");
    return;
  }
  const domain = built.content;
  const version = asVersion("20260704143031");
  if (!isOk(version)) {
    return;
  }

  // 1. Derive + apply the schema, then boot: OK.
  const db = openSqliteDb();
  const migration = schemaOf(version.content)(
    domain,
  );
  await runScript(db)(migration.up);
  const boot = await assertPersistedSchema(
    db,
    version.content,
  )(domain);
  console.log(
    "boot against matching store:",
    matchResult(
      () => "error",
      report,
    )(boot),
  );

  // 2. Seed, export, re-import into a fresh database.
  await importDomain(db, domain)({
    manifest: {
      domainVersion: "seed",
      derivationVersion: "1",
      schemaHead: none(),
    },
    entities: [
      {
        entity: "users",
        rows: [{ id: 1, email: "a@b.c" }],
      },
    ],
  });
  const exported = await exportDomain(
    db,
    some(version.content),
  )(domain);
  if (isOk(exported)) {
    const fresh = openSqliteDb();
    await runScript(fresh)(migration.up);
    await importDomain(
      fresh,
      domain,
    )(exported.content);
    const reboot = await exportDomain(
      fresh,
      some(version.content),
    )(domain);
    console.log(
      "round-trip preserved rows:",
      isOk(reboot),
    );
  }

  // 3. Boot against an INCOMPATIBLE store: refuse.
  const wrong = openSqliteDb();
  await runScript(wrong)(
    "CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL);",
  );
  const refuse = await assertPersistedSchema(
    wrong,
    version.content,
  )(domain);
  console.log(
    "boot against incompatible store:",
    matchResult(
      () => "error",
      report,
    )(refuse),
  );

  // 4. The read-only delivery shape a shell is regenerated from.
  console.log(
    "delivery resources:",
    toDeliveryShape(domain).resources.map(
      (r) => r.name,
    ),
  );
};

void main();
