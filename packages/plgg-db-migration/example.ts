/**
 * plgg-db-migration — dbmate-style schema migrations as plgg pipelines.
 *
 *   cd packages/plgg-db-migration && npx tsx example.ts
 *
 * Runs the full flow against a real node:sqlite database — migrateUp → status →
 * migrateDown — then the on-demand per-tenant path (a concurrent first-touch).
 * The only driver-aware code is the `open` seam; the package itself ships no
 * driver (zero deps, no native binding). SQLite runs out of the box; Postgres /
 * MySQL are supported via an app-supplied `Db` adapter — see the README's
 * "Db-adapter contract".
 */
import { DatabaseSync } from "node:sqlite";
import {
  SoftStr,
  PromisedResult,
  ok,
  isOk,
  some,
  matchOption,
} from "plgg";
import {
  Db,
  ExecResult,
  Sql,
  SqlValue,
} from "plgg-sql";
import {
  sqlite,
  migrator,
  tenantDb,
  asTenantId,
  versionString,
  TenantId,
  TenantDb,
  MigrationError,
  readMigrations,
  migrateUp,
  migrateDown,
  status,
  migrateTenant,
  TenantMigrationConfig,
} from "plgg-db-migration/index";

// ── the SQLite seam: the only code that knows which driver we use ──
// An app supplies one of these (ideally with busy_timeout / WAL for the
// per-tenant path). The package never opens a connection itself.
const open = (path: SoftStr): Db => {
  const conn = new DatabaseSync(path);
  const bind = (
    s: Sql,
  ): ReadonlyArray<string | number | null> =>
    s.content.params.map(
      matchOption(
        () => null,
        (v: SqlValue) =>
          typeof v === "boolean"
            ? v
              ? 1
              : 0
            : v,
      ),
    );
  return {
    all: async (s) =>
      conn
        .prepare(s.content.text)
        .all(...bind(s)),
    run: async (s): Promise<ExecResult> => {
      const r = conn
        .prepare(s.content.text)
        .run(...bind(s));
      return {
        changes: Number(r.changes),
        lastInsertId: some(
          Number(r.lastInsertRowid),
        ),
      };
    },
    // trusted multi-statement scripts (a migration body) run verbatim;
    // a single prepared statement cannot.
    execScript: async (text) => {
      conn.exec(text);
    },
    begin: async () => {
      conn.exec("BEGIN");
    },
    commit: async () => {
      conn.exec("COMMIT");
    },
    rollback: async () => {
      conn.exec("ROLLBACK");
    },
  };
};

// ── load the migrations directory (databases/<db>/migrations) ──
const dirRes = await readMigrations(
  "databases/app/migrations",
);
if (!isOk(dirRes)) {
  console.error(
    "example: could not read migrations",
    dirRes.content,
  );
  process.exit(1);
}
const dir = dirRes.content;

// ── the dbmate flow: up → status → down, one shared :memory: db ──
const m = migrator(open(":memory:"), sqlite, dir);

const up = await migrateUp(m);
if (!isOk(up)) {
  console.error("example: up failed", up.content);
  process.exit(1);
}
console.log(
  "up:     applied",
  up.content.map(versionString),
);

const st = await status(m);
if (!isOk(st)) {
  console.error(
    "example: status failed",
    st.content,
  );
  process.exit(1);
}
console.log(
  "status: pending",
  st.content.pending.length,
  "applied",
  st.content.applied.length,
);

const down = await migrateDown(m);
if (!isOk(down)) {
  console.error(
    "example: down failed",
    down.content,
  );
  process.exit(1);
}
console.log(
  "down:   rolled back",
  down.content.map(versionString),
);

// ── on-demand per-tenant migration (lazy, exactly-once on first touch) ──
const tenantConfig: TenantMigrationConfig = {
  resolveTenantDb: (
    id: TenantId,
  ): PromisedResult<TenantDb, MigrationError> =>
    Promise.resolve(
      ok(
        tenantDb(
          id,
          open(":memory:"),
          ":memory:",
        ),
      ),
    ),
  dir,
  dialect: sqlite,
};

const ta = asTenantId("tenant-a");
const tb = asTenantId("tenant-b");
if (!isOk(ta) || !isOk(tb)) {
  console.error("example: bad tenant id");
  process.exit(1);
}

// Two simultaneous first-touch requests for tenant-a coalesce into ONE
// migration run (the in-process keyed mutex); tenant-b migrates independently.
const [a1, a2, b1] = await Promise.all([
  migrateTenant(tenantConfig)(ta.content),
  migrateTenant(tenantConfig)(ta.content),
  migrateTenant(tenantConfig)(tb.content),
]);
console.log(
  "tenant: a#1 applied",
  isOk(a1) ? a1.content.length : "err",
  "· a#2 applied",
  isOk(a2) ? a2.content.length : "err",
  "· b applied",
  isOk(b1) ? b1.content.length : "err",
);
