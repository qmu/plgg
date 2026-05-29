import { DatabaseSync } from "node:sqlite";
import {
  Option,
  SoftStr,
  none,
  some,
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
 * the driver). Booleans are coerced to 1/0 and `None` params to NULL at the
 * bind boundary, matching `plgg-sql/example-web.ts`.
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
 * `None`. Dropping null-valued keys (and coercing `completed` 0/1 to a real
 * boolean) makes the row decode cleanly through `asTodo`.
 */
export const compactRow = (row: unknown): unknown =>
  typeof row === "object" && row !== null
    ? Object.fromEntries(
        Object.entries(row)
          .filter(([, v]) => v !== null)
          .map(([k, v]) =>
            k === "completed"
              ? [k, v === 1 || v === true]
              : [k, v],
          ),
      )
    : row;

/** The SQL strings used by the controller — co-located with the schema. */
export const LIST_TODOS_SQL = sql`SELECT id, title, completed, createdAt, completedAt FROM todos ORDER BY createdAt`;

export const getTodoByIdSql = (id: SoftStr): Sql =>
  sql`SELECT id, title, completed, createdAt, completedAt FROM todos WHERE id = ${id}`;

export const insertTodoSql = (
  id: SoftStr,
  title: SoftStr,
  createdAt: SoftStr,
): Sql =>
  sql`INSERT INTO todos (id, title, completed, createdAt) VALUES (${id}, ${title}, ${0}, ${createdAt})`;

export const updateTodoCompletionSql = (
  id: SoftStr,
  completed: boolean,
  completedAt: Option<SoftStr>,
): Sql =>
  sql`UPDATE todos SET completed = ${completed ? 1 : 0}, completedAt = ${completedAt} WHERE id = ${id}`;

export const deleteTodoSql = (id: SoftStr): Sql =>
  sql`DELETE FROM todos WHERE id = ${id}`;

/**
 * Opens a fresh in-memory database, creates the `todos` table, and seeds three
 * rows — one completed (with `completedAt`), one open with a long title, one
 * fresh — so the SSR view and tests exercise both `Option Some` and `None`
 * branches of `completedAt`. Used by `server.ts` and by tests.
 */
export const createTodosDb = async (
  path: SoftStr = ":memory:",
): Promise<Db> => {
  const db = open(path);
  await db.run(
    sql`CREATE TABLE todos (id TEXT PRIMARY KEY, title TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL, completedAt TEXT)`,
  );
  await db.run(
    sql`INSERT INTO todos (id, title, completed, createdAt, completedAt) VALUES (${"t1"}, ${"Wire the pipeline"}, ${1}, ${"2026-05-26T09:00:00Z"}, ${some("2026-05-27T18:30:00Z")})`,
  );
  await db.run(
    sql`INSERT INTO todos (id, title, completed, createdAt, completedAt) VALUES (${"t2"}, ${"Write the README so the To-Do app explains itself"}, ${0}, ${"2026-05-27T09:00:00Z"}, ${none()})`,
  );
  await db.run(
    sql`INSERT INTO todos (id, title, completed, createdAt, completedAt) VALUES (${"t3"}, ${"Ship the demo"}, ${0}, ${"2026-05-28T09:00:00Z"}, ${none()})`,
  );
  return db;
};
