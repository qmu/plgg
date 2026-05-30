/**
 * plgg-sql — database work as pipeline steps.
 *
 *   npx tsx src/plgg-sql/example.ts
 *
 * Each handler below is ONE `proc` chain. Validation, SQL building, DML, the
 * transaction, and row mapping are all just steps in it — the same vocabulary a
 * plgg-server HTTP handler uses, so a DB step and a web step are interchangeable
 * links in the same pipe. The only driver-aware code is the `open` seam.
 */
import { DatabaseSync } from "node:sqlite";
import {
  Result,
  InvalidError,
  Num,
  SoftStr,
  proc,
  cast,
  asObj,
  forProp,
  asNum,
  asSoftStr,
  refine,
  decodeJson,
  some,
  matchResult,
  matchOption,
} from "plgg";
import {
  Db,
  ExecResult,
  Sql,
  SqlValue,
  sql,
  query,
  exec,
  transaction,
  decodeRow,
  decodeRows,
} from "plgg-sql/index";

// ── the SQLite seam: the only code that knows which driver we use ──
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
  // async so a driver throw (e.g. a constraint violation) becomes a rejected
  // promise that `query`/`exec` fold into a value-level SqlError.
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

// ── validation + mapping: plain plgg core, no plgg-sql needed ──
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

const db = open(":memory:");

// ── a write: validate → INSERT → read back, all atomic, one pipe ──
const createUser = (
  payload: SoftStr,
): Promise<Result<User, Error>> =>
  proc(
    payload,
    decodeJson, // text  → unknown
    asNewUser, // validate → NewUser  (or short-circuits here)
    transaction(db, (u: NewUser) =>
      proc(
        sql`INSERT INTO users (name, email) VALUES (${u.name}, ${u.email})`,
        exec(db), // DML → ExecResult
        (r: ExecResult) =>
          query(db)(
            sql`SELECT id, name, email FROM users WHERE id = ${r.lastInsertId}`,
          ), // build + run the read-back → rows
        decodeRow(asUser), // rows → User
      ),
    ),
  );

// ── a read: build → run → map a list ──
const listUsers = (): Promise<
  Result<ReadonlyArray<User>, Error>
> =>
  proc(
    sql`SELECT id, name, email FROM users ORDER BY id`,
    query(db),
    decodeRows(asUser),
  );

const render = (r: Result<unknown, Error>): SoftStr =>
  matchResult(
    (e: Error) => `Err — ${e.message}`,
    (v: unknown) => `Ok  — ${JSON.stringify(v)}`,
  )(r);

const main = async (): Promise<void> => {
  await db.run(
    sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE)`,
  );

  // happy path: created and read back as a typed User
  console.log("create Ada       :", render(await createUser('{"name":"Ada","email":"ada@x.io"}')));
  // validation fails before any SQL runs
  console.log("create invalid   :", render(await createUser('{"name":"A","email":"nope"}')));
  // duplicate email → INSERT throws → transaction ROLLS BACK, nothing persisted
  console.log("create duplicate :", render(await createUser('{"name":"Ada II","email":"ada@x.io"}')));
  // proof of rollback: only the first Ada is there
  console.log("list everyone    :", render(await listUsers()));
};

main();

// These same steps drop into a plgg-server HTTP handler unchanged — `param` and
// `jsonResponse` are just more links in the same proc chain. See `src/example/`
// for the full request → DB → response demo.
