import { DatabaseSync } from "node:sqlite";
import {
  SoftStr,
  some,
  none,
  matchOption,
} from "plgg";
import {
  Db,
  ExecResult,
  Sql,
  SqlValue,
  sql,
} from "plgg-sql";

/**
 * The node:sqlite seam — the ONLY driver-aware code in the example. It adapts a
 * `DatabaseSync` to the plgg-sql `Db` interface (the rest of the app never sees
 * the driver). Booleans are coerced to 1/0 and `None` params to NULL at the bind
 * boundary, mirroring `plgg-sql/example-web.ts`.
 */
export const open = (path: SoftStr): Db => {
  const conn = new DatabaseSync(path);
  const bind = (
    s: Sql,
  ): ReadonlyArray<string | number | null> =>
    s.content.params.map(
      matchOption(
        () => null,
        (v: SqlValue) =>
          typeof v === "boolean" ? (v ? 1 : 0) : v,
      ),
    );
  return {
    all: async (s) =>
      conn.prepare(s.content.text).all(...bind(s)),
    run: async (s): Promise<ExecResult> => {
      const r = conn
        .prepare(s.content.text)
        .run(...bind(s));
      return {
        changes: Number(r.changes),
        lastInsertId: some(Number(r.lastInsertRowid)),
      };
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

/**
 * SQLite returns every selected column (NULL for missing values), but
 * `forOptionProp` reads a present-but-null key as a failed cast rather than
 * `None`. Dropping null-valued keys makes a NULL column decode to `None`, which
 * is how `asArticle` models an absent `memo`.
 */
export const compactRow = (row: unknown): unknown =>
  typeof row === "object" && row !== null
    ? Object.fromEntries(
        Object.entries(row).filter(
          ([, v]) => v !== null,
        ),
      )
    : row;

/**
 * Opens a fresh in-memory database, creates the `articles` table, and seeds a
 * few rows (one with a NULL `memo`, to exercise the `Option` path). Returns the
 * ready `Db`. Used by the server entry and by tests.
 */
export const createArticlesDb = async (
  path: SoftStr = ":memory:",
): Promise<Db> => {
  const db = open(path);
  await db.run(
    sql`CREATE TABLE articles (id TEXT PRIMARY KEY, createdAt TEXT NOT NULL, name TEXT NOT NULL, memo TEXT)`,
  );
  await db.run(
    sql`INSERT INTO articles (id, createdAt, name, memo) VALUES (${"a1"}, ${"2026-05-01T09:00:00Z"}, ${"Pipelines all the way down"}, ${"server + db + view as one proc chain"})`,
  );
  await db.run(
    sql`INSERT INTO articles (id, createdAt, name, memo) VALUES (${"a2"}, ${"2026-05-02T09:00:00Z"}, ${"Errors as values"}, ${"folded into HttpError at the edge"})`,
  );
  await db.run(
    sql`INSERT INTO articles (id, createdAt, name, memo) VALUES (${"a3"}, ${"2026-05-03T09:00:00Z"}, ${"Isomorphic rendering"}, ${none()})`,
  );
  return db;
};
