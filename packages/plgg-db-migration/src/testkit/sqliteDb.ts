import { DatabaseSync } from "node:sqlite";
import { some, matchOption } from "plgg";
import {
  Db,
  ExecResult,
  Sql,
  SqlValue,
} from "plgg-sql";

/**
 * Test-only seam: a `node:sqlite` {@link Db} (the real engine, per the test
 * policy's "test against the real thing"). Defaults to in-memory; pass a file
 * `path` for tests that need persistence across connections (the per-tenant
 * cold-start PoC). Mirrors the `open` seam in `plgg-sql`'s example, plus
 * `execScript`. Not part of the public API or the bundle; excluded from coverage.
 */
export const openSqliteDb = (
  path: string = ":memory:",
): Db => {
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
