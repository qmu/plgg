import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { some, isOk } from "plgg";
import {
  sql,
  query,
  asSqlIdent,
  identSql,
  fts5Table,
  fts5Column,
  externalContent,
  createFts5Table,
  fts5Match,
  fts5Phrase,
  fts5SyncTriggers,
} from "plgg-sql";
import { sqlite } from "plgg-db-migration/domain/model/Dialect";
import { migrateUp } from "plgg-db-migration/domain/usecase/migrateUp";
import { migrateDown } from "plgg-db-migration/domain/usecase/migrateDown";
import { openSqliteDb } from "plgg-db-migration/testkit/sqliteDb";
import { buildMigrator } from "plgg-db-migration/testkit/migrator";

const fail = () => check(true, toBe(false));

const idOf = (s: string) => {
  const r = asSqlIdent(s);
  if (!isOk(r)) {
    throw new Error(`bad ident: ${s}`);
  }
  return r.content;
};

const fts = idOf("fts");
const src = idOf("src");

// The real library output — an external-content FTS5 index
// plus its sync triggers — assembled into ONE migration `up`
// body (multiple statements, and the AI/AD/AU triggers carry
// embedded `;` inside BEGIN…END). This is exactly what a
// content-index migration (ticket 16) will emit; the point of
// the spec is that plgg-db-migration passes it through
// `execScript` verbatim, with zero engine changes.
const buildUp = (): string => {
  const spec = fts5Table({
    name: fts,
    columns: [
      fts5Column(idOf("title")),
      fts5Column(idOf("body")),
    ],
    content: externalContent(src, idOf("id")),
    tokenizer: some("trigram"),
  });
  if (!isOk(spec)) {
    throw new Error("bad spec");
  }
  const triggers = fts5SyncTriggers(spec.content);
  if (!isOk(triggers)) {
    throw new Error("no triggers");
  }
  return (
    [
      "CREATE TABLE src(id INTEGER PRIMARY KEY, title TEXT, body TEXT)",
      createFts5Table(spec.content).content.text,
      ...triggers.content.map((t) => t.content.text),
    ].join(";\n") + ";"
  );
};

const DOWN =
  "DROP TRIGGER fts_au;\n" +
  "DROP TRIGGER fts_ad;\n" +
  "DROP TRIGGER fts_ai;\n" +
  "DROP TABLE fts;\n" +
  "DROP TABLE src;";

test("an FTS5 up/down migration (index + triggers) applies and rolls back unchanged", async () => {
  const db = openSqliteDb();
  const built = buildMigrator(db, sqlite, [
    {
      version: "20260705000000",
      name: "content_fts",
      up: buildUp(),
      down: some(DOWN),
    },
  ]);
  if (!isOk(built)) {
    return fail();
  }

  // UP: the FTS5 DDL + trigger bodies flow through verbatim.
  const up = await migrateUp(built.content);

  // the triggers keep the index in sync as source rows land
  await db.run(
    sql`INSERT INTO ${identSql(src)}(title, body) VALUES(${"Intro"}, ${"the quick brown fox"})`,
  );
  const hits = await query(db)(
    sql`SELECT rowid FROM ${identSql(fts)} WHERE ${fts5Match(fts)(fts5Phrase("quick"))}`,
  );

  // DOWN: drops the triggers + tables; the source table is gone
  const down = await migrateDown(built.content);
  const leftover = await query(db)(
    sql`SELECT count(*) AS n FROM sqlite_master WHERE name IN (${"fts"}, ${"src"})`,
  );

  return all([
    check(
      up,
      okThen((vs) => toBe(1)(vs.length)),
    ),
    check(
      hits,
      okThen((rows) => toBe(1)(rows.length)),
    ),
    check(
      down,
      okThen((vs) => toBe(1)(vs.length)),
    ),
    check(
      leftover,
      okThen((rows) =>
        toBe(true)(
          rows.length === 1 &&
            typeof rows[0] === "object" &&
            rows[0] !== null &&
            "n" in rows[0] &&
            rows[0].n === 0,
        ),
      ),
    ),
  ]);
});
