/**
 * plgg-http-router + plgg-sql — the whole point: an HTTP handler and a database query
 * are the SAME kind of pipeline step, so one `proc` chain runs
 * request → validate → SQL → map → response.
 *
 * Run it:
 *   npx tsx src/plgg-sql/example-web.ts
 * then:
 *   curl localhost:3000/users
 *   curl -X POST localhost:3000/users -d '{"name":"Ada","email":"ada@x.io"}'
 *   curl -X POST localhost:3000/users -d '{"name":"A","email":"nope"}'     # 400 (validation)
 *   curl -i -X POST localhost:3000/users -d '{"name":"Ada II","email":"ada@x.io"}'  # 409 Conflict, rolled back
 *   curl localhost:3000/users/1                                            # found
 *   curl -i localhost:3000/users/999                                       # 404
 *
 * The only driver-aware code is `open`. plgg-http-router supplies `param`/`jsonResponse`;
 * plgg-sql supplies `sql`/`query`/`exec`/`transaction`; plgg core supplies
 * `decodeJson`/`cast`/`proc`. They interleave as one chain.
 */
import { DatabaseSync } from "node:sqlite";
import {
  Result,
  InvalidError,
  BaseError,
  Num,
  SoftStr,
  proc,
  pipe,
  cast,
  asObj,
  forProp,
  asNum,
  asSoftStr,
  refine,
  decodeJson,
  some,
  ok,
  err,
  okOr,
  mapErr,
  fromNullable,
  matchOption,
} from "plgg";
import {
  web,
  get,
  post,
  toFetch,
  serve,
  param,
  jsonResponse,
  notFound,
  badRequest,
  internalError,
  statusError,
  statusOf,
  HttpError,
} from "plgg-http-router";
import {
  Db,
  ExecResult,
  Sql,
  SqlValue,
  SqlError,
  sql,
  query,
  exec,
  transaction,
  decodeRow,
  decodeRows,
} from "plgg-sql/index";

// ── the SQLite seam (the only driver-aware code) ──
const open = (path: SoftStr): Db => {
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
    all: async (s) => conn.prepare(s.content.text).all(...bind(s)),
    run: async (s): Promise<ExecResult> => {
      const r = conn.prepare(s.content.text).run(...bind(s));
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

// ── validation + mapping (plain plgg core) ──
type NewUser = { name: SoftStr; email: SoftStr };
const asNewUser = (v: unknown): Result<NewUser, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("name", (x) =>
      cast(x, asSoftStr, refine((s) => s.length >= 2, "name too short")),
    ),
    forProp("email", (x) =>
      cast(x, asSoftStr, refine((s) => s.includes("@"), "email invalid")),
    ),
  );

type User = { id: Num; name: SoftStr; email: SoftStr };
const asUser = (row: unknown): Result<User, InvalidError> =>
  cast(
    row,
    asObj,
    forProp("id", asNum),
    forProp("name", asSoftStr),
    forProp("email", asSoftStr),
  );

// an app-level "not found" so the pipe can signal a 404 as a value
class NotFound extends BaseError {
  public name = "NotFound";
}
const firstOr404 = (
  rows: ReadonlyArray<unknown>,
): Result<unknown, NotFound> =>
  pipe(
    fromNullable(rows[0]),
    matchOption<unknown, Result<unknown, NotFound>>(
      () => err(new NotFound("user not found")),
      (row) => ok(row),
    ),
  );

// Fold any pipeline error into the HTTP error channel at the edge. This is the
// one place the app decides status codes: a unique/constraint violation is a
// client conflict (409), other SQL failures are 500, a missing row is 404, and
// everything else (validation) is 400. The "constraint" check is a deliberately
// simple SQLite-message heuristic; a production app would key off a driver
// error code carried on the SqlError.
const toHttpError = (e: Error): HttpError =>
  e instanceof SqlError
    ? e.message.includes("constraint")
      ? statusError(statusOf(409), "that value is already taken")
      : internalError("database error")
    : e instanceof NotFound
      ? notFound("user not found")
      : badRequest(e.message);

const db = open(":memory:");

// ── the app: every handler is one proc chain of web + db + core steps ──
const app = pipe(
  web(),

  // create: validate body → INSERT + read-back (atomic) → 201
  post("/users", (c) =>
    proc(
      c.req.body,
      decodeJson, //                         text → unknown
      asNewUser, //                          validate → NewUser
      transaction(db, (u: NewUser) =>
        proc(
          sql`INSERT INTO users (name, email) VALUES (${u.name}, ${u.email})`,
          exec(db),
          (r: ExecResult) =>
            query(db)(
              sql`SELECT id, name, email FROM users WHERE id = ${r.lastInsertId}`,
            ),
          decodeRow(asUser),
        ),
      ),
      (user: User) => jsonResponse(user, 201),
    ).then(mapErr(toHttpError)),
  ),

  // list: SELECT → map → JSON
  get("/users", () =>
    proc(
      sql`SELECT id, name, email FROM users ORDER BY id`,
      query(db),
      decodeRows(asUser),
      (users: ReadonlyArray<User>) => jsonResponse(users),
    ).then(mapErr(toHttpError)),
  ),

  // lookup: param → SELECT → 404-or-map → JSON
  get("/users/:id", (c) =>
    proc(
      c,
      (ctx) =>
        pipe(ctx, param("id"), okOr(new InvalidError({ message: "id is required" }))),
      (id: SoftStr) =>
        query(db)(
          sql`SELECT id, name, email FROM users WHERE id = ${id}`,
        ),
      firstOr404,
      asUser,
      (user: User) => jsonResponse(user),
    ).then(mapErr(toHttpError)),
  ),
);

db.run(
  sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE)`,
).then(() =>
  pipe(
    app,
    toFetch,
    serve({ port: 3000 }, () =>
      console.log("listening on http://localhost:3000"),
    ),
  ),
);
