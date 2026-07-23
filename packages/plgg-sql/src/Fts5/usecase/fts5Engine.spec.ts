import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { DatabaseSync } from "node:sqlite";
import {
  type Obj,
  type Result,
  type InvalidError,
  type Num,
  cast,
  asObj,
  forProp,
  asNum,
  some,
  none,
  isOk,
  matchOption,
} from "plgg";
import {
  type Db,
  type ExecResult,
  type Sql,
  type SqlValue,
  type SqlIdent,
  sql,
  query,
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
  fts5Rebuild,
  fts5SyncTriggers,
} from "plgg-sql/index";

// ── a real node:sqlite Db seam (FTS5 must run against the
// real engine, per the test policy). Mirrors example.ts's
// `open`; spec-local, not part of the public surface. ──
const open = (): Db => {
  const conn = new DatabaseSync(":memory:");
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

const id = (s: string): SqlIdent => {
  const r = asSqlIdent(s);
  if (!isOk(r)) {
    throw new Error(`test ident invalid: ${s}`);
  }
  return r.content;
};

const fts = id("fts");
const src = id("src");

// Build an external-content index over `src(id, title, body)`
// with the sync triggers wired, then return its Db.
const setup = async (): Promise<Db> => {
  const db = open();
  const spec = fts5Table({
    name: fts,
    columns: [
      fts5Column(id("title")),
      fts5Column(id("body")),
    ],
    content: externalContent(src, id("id")),
    tokenizer: none(),
  });
  if (!isOk(spec)) {
    throw new Error("setup: bad spec");
  }
  await db.execScript(
    "CREATE TABLE src(id INTEGER PRIMARY KEY, title TEXT, body TEXT)",
  );
  await db.execScript(
    createFts5Table(spec.content).content.text,
  );
  const triggers = fts5SyncTriggers(spec.content);
  if (!isOk(triggers)) {
    throw new Error("setup: triggers not built");
  }
  for (const t of triggers.content) {
    await db.execScript(t.content.text);
  }
  return db;
};

const insertDoc = (
  db: Db,
  title: string,
  body: string,
): Promise<ExecResult> =>
  db.run(
    sql`INSERT INTO ${identSql(src)}(title, body) VALUES(${title}, ${body})`,
  );

// A search hit: just the rowid, decoded through a caster so
// results re-enter the domain by parse-don't-validate.
type Hit = Obj<{ rowid: Num }>;
const asHit = (
  v: unknown,
): Result<Hit, InvalidError> =>
  cast(v, asObj, forProp("rowid", asNum));

// A ranked search over the always-on baseline: sanitize the
// user term, MATCH it, order by bm25 (ascending = most
// relevant first), and decode the rows.
const search = (
  db: Db,
  term: string,
): Promise<Result<ReadonlyArray<Hit>, unknown>> =>
  query(db)(
    sql`SELECT rowid FROM ${identSql(fts)} WHERE ${fts5Match(
      fts,
    )(
      fts5Phrase(term),
    )} ORDER BY ${bm25Rank(fts, none())}`,
  ).then((r) =>
    isOk(r) ? decodeRows(asHit)(r.content) : r,
  );

test("external-content index returns bm25-ranked, decodeRows-typed hits", async () => {
  const db = await setup();
  await insertDoc(db, "Intro", "the quick brown fox");
  await insertDoc(db, "Later", "a slow green turtle");
  return check(
    await search(db, "quick"),
    okThen((hits) =>
      // the fox doc (rowid 1) matches "quick"; the turtle
      // doc does not — so exactly one ranked hit comes back
      toEqual([1])(hits.map((h) => h.rowid)),
    ),
  );
});

test("triggers keep the index in sync across update and delete", async () => {
  const db = await setup();
  await insertDoc(db, "Intro", "the quick brown fox");
  await insertDoc(db, "Later", "a slow green turtle");
  // UPDATE row 1: quick disappears, dolphin appears
  await db.run(
    sql`UPDATE ${identSql(src)} SET body = ${"now mentions dolphin"} WHERE id = ${1}`,
  );
  // DELETE row 2: turtle disappears
  await db.run(
    sql`DELETE FROM ${identSql(src)} WHERE id = ${2}`,
  );
  const quick = await search(db, "quick");
  const dolphin = await search(db, "dolphin");
  const turtle = await search(db, "turtle");
  return all([
    check(
      quick,
      okThen((h) => toBe(0)(h.length)),
    ),
    check(
      dolphin,
      okThen((h) => toBe(1)(h.length)),
    ),
    check(
      turtle,
      okThen((h) => toBe(0)(h.length)),
    ),
  ]);
});

test("fts5Rebuild restores the index from the source table", async () => {
  const db = await setup();
  await insertDoc(db, "Intro", "the quick brown fox");
  await db.run(fts5Rebuild(fts));
  return check(
    await search(db, "quick"),
    okThen((h) => toBe(1)(h.length)),
  );
});

test("fts5Phrase makes every hostile search crash-safe (no throw, Ok result)", async () => {
  const db = await setup();
  await insertDoc(db, "Intro", "the quick brown fox");
  const hostile = [
    'quick"',
    "quick(",
    "AND",
    "*",
    "",
    'say "hi" (x)',
    "a OR b",
  ];
  const results = await Promise.all(
    hostile.map((h) => search(db, h)),
  );
  // none threw; every one is an Ok Result
  return check(
    results.every((r) => isOk(r)),
    toBe(true),
  );
});

test("a raw (unsanitized) hostile query surfaces as an Err<SqlError>, never a throw", async () => {
  const db = await setup();
  await insertDoc(db, "Intro", "the quick brown fox");
  // bind the raw string directly (NOT through fts5Phrase):
  // FTS5 rejects the unbalanced quote with a syntax error,
  // which `query` folds onto the Result channel.
  return check(
    await query(db)(
      sql`SELECT rowid FROM ${identSql(fts)} WHERE ${fts5Match(fts)('quick"')}`,
    ),
    errThen((e) => toBe("SqlError")(e.__tag)),
  );
});
