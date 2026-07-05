import { DatabaseSync } from "node:sqlite";
import {
  type SoftStr,
  matchOption,
  some,
} from "plgg";
import {
  type Db,
  type Sql,
  type SqlValue,
  type ExecResult,
} from "plgg-sql";

/**
 * The ONLY driver-aware code in plgg-content — the
 * `node:sqlite` implementation of plgg-sql's {@link Db}
 * seam, kept under `vendors/` so the domain stays
 * driver-agnostic (and the vendor-boundary gate is
 * satisfied for this fresh package). Mirrors
 * `plgg-sql/example.ts`. Every call is async so a driver
 * throw becomes a rejected promise that `query`/`exec`
 * fold into a value-level `SqlError`.
 */
export const openDb = (path: SoftStr): Db => {
  const conn = new DatabaseSync(path);
  // ON DELETE CASCADE (documents → chunks) is a no-op
  // unless foreign keys are enabled on the connection.
  conn.exec("PRAGMA foreign_keys = ON");
  // WAL: readers never block the single writer and vice
  // versa (ticket 28, D5 served-instance policy). A no-op
  // for a `:memory:` handle, which stays memory-journaled.
  conn.exec("PRAGMA journal_mode = WAL");
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
    all: async (s: Sql) =>
      conn.prepare(s.content.text).all(...bind(s)),
    run: async (s: Sql): Promise<ExecResult> => {
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
    execScript: async (text: SoftStr) => {
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
