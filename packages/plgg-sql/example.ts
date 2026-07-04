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
  Obj,
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
  none,
  isOk,
  matchResult,
  matchOption,
  isPlggError,
  printPlggError,
} from "plgg";
import {
  Db,
  ExecResult,
  Sql,
  SqlValue,
  SqlIdent,
  sql,
  query,
  exec,
  transaction,
  decodeRow,
  decodeRows,
  asSqlIdent,
  identSql,
  fts5Table,
  fts5Column,
  externalContent,
  createFts5Table,
  fts5Match,
  bm25Rank,
  fts5Phrase,
  fts5SyncTriggers,
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
          typeof v === "boolean"
            ? v
              ? 1
              : 0
            : v,
      ),
    );
  // async so a driver throw (e.g. a constraint violation) becomes a rejected
  // promise that `query`/`exec` fold into a value-level SqlError.
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
    // trusted multi-statement scripts (DDL/seed) run verbatim through
    // node:sqlite's `exec`, which a single prepared statement cannot do.
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

// ── validation + mapping: plain plgg core, no plgg-sql needed ──
type NewUser = Obj<{
  name: SoftStr;
  email: SoftStr;
}>;
const asNewUser = (
  v: unknown,
): Result<NewUser, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("name", (x) =>
      cast(
        x,
        asSoftStr,
        refine(
          (s) => s.length >= 2,
          "name too short",
        ),
      ),
    ),
    forProp("email", (x) =>
      cast(
        x,
        asSoftStr,
        refine(
          (s) => s.includes("@"),
          "email invalid",
        ),
      ),
    ),
  );

type User = Obj<{
  id: Num;
  name: SoftStr;
  email: SoftStr;
}>;
const asUser = (
  row: unknown,
): Result<User, InvalidError> =>
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
): Promise<Result<User, unknown>> =>
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
  Result<ReadonlyArray<User>, unknown>
> =>
  proc(
    sql`SELECT id, name, email FROM users ORDER BY id`,
    query(db),
    decodeRows(asUser),
  );

const render = (
  r: Result<unknown, unknown>,
): SoftStr =>
  matchResult(
    (e: unknown) =>
      `Err — ${
        isPlggError(e)
          ? printPlggError(e)
          : String(e)
      }`,
    (v: unknown) => `Ok  — ${JSON.stringify(v)}`,
  )(r);

// ── full-text search: the always-on FTS5 baseline (D11) ──
// A `docs` table is the source of truth; an external-content
// FTS5 index over it is a DERIVED, rebuildable view kept in
// sync by triggers (D4). Names ride in as `SqlIdent`s; a
// visitor's raw search string is made crash-safe by
// `fts5Phrase`, then bound — never concatenated.
const asIdent = (s: SoftStr): SqlIdent => {
  const r = asSqlIdent(s);
  if (!isOk(r)) {
    throw new Error(`bad identifier: ${s}`);
  }
  return r.content;
};
const ftsIdx = asIdent("docs_fts");
const docsTbl = asIdent("docs");

// One search hit, decoded back into the domain.
type Doc = Obj<{ title: SoftStr; body: SoftStr }>;
const asDoc = (
  v: unknown,
): Result<Doc, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("title", asSoftStr),
    forProp("body", asSoftStr),
  );

// build the index + sync triggers over `docs`
const setupSearch = async (): Promise<void> => {
  const spec = fts5Table({
    name: ftsIdx,
    columns: [
      fts5Column(asIdent("title")),
      fts5Column(asIdent("body")),
    ],
    content: externalContent(docsTbl, asIdent("id")),
    tokenizer: none(),
  });
  if (!isOk(spec)) {
    return;
  }
  await db.execScript(
    "CREATE TABLE docs(id INTEGER PRIMARY KEY, title TEXT, body TEXT)",
  );
  await db.execScript(
    createFts5Table(spec.content).content.text,
  );
  const triggers = fts5SyncTriggers(spec.content);
  if (isOk(triggers)) {
    for (const t of triggers.content) {
      await db.execScript(t.content.text);
    }
  }
};

// a ranked search — sanitize → MATCH → order by bm25 → map —
// all one proc chain, the same vocabulary as the user handlers
const searchDocs = (
  term: SoftStr,
): Promise<Result<ReadonlyArray<Doc>, unknown>> =>
  proc(
    sql`SELECT title, body FROM ${identSql(
      docsTbl,
    )} WHERE id IN (SELECT rowid FROM ${identSql(
      ftsIdx,
    )} WHERE ${fts5Match(ftsIdx)(
      fts5Phrase(term),
    )} ORDER BY ${bm25Rank(ftsIdx, none())})`,
    query(db),
    decodeRows(asDoc),
  );

const main = async (): Promise<void> => {
  await db.run(
    sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE)`,
  );

  // happy path: created and read back as a typed User
  console.log(
    "create Ada       :",
    render(
      await createUser(
        '{"name":"Ada","email":"ada@x.io"}',
      ),
    ),
  );
  // validation fails before any SQL runs
  console.log(
    "create invalid   :",
    render(
      await createUser(
        '{"name":"A","email":"nope"}',
      ),
    ),
  );
  // duplicate email → INSERT throws → transaction ROLLS BACK, nothing persisted
  console.log(
    "create duplicate :",
    render(
      await createUser(
        '{"name":"Ada II","email":"ada@x.io"}',
      ),
    ),
  );
  // proof of rollback: only the first Ada is there
  console.log(
    "list everyone    :",
    render(await listUsers()),
  );

  // ── full-text search demo ──
  await setupSearch();
  const seed: ReadonlyArray<
    readonly [SoftStr, SoftStr]
  > = [
    ["Pipelines", "values flow through pure functions"],
    ["Errors", "expected failures travel as data"],
    ["Effects", "async work is proc, a pipeline step"],
  ];
  for (const [title, body] of seed) {
    await db.run(
      sql`INSERT INTO ${identSql(
        docsTbl,
      )}(title, body) VALUES(${title}, ${body})`,
    );
  }
  console.log(
    'search "pipeline":',
    render(await searchDocs("pipeline")),
  );
  // a hostile query is sanitized, never a syntax error
  console.log(
    'search hostile   :',
    render(await searchDocs('data" OR (')),
  );
};

main();

// These same steps drop into a plgg-server HTTP handler unchanged — `param` and
// `jsonResponse` are just more links in the same proc chain. See `src/example/`
// for the full request → DB → response demo.
