import {
  test,
  check,
  all,
  toBe,
  toContain,
  okThen,
  someThen,
  shouldBeOk,
} from "plgg-test";
import {
  sql,
  runScript,
  exec,
} from "plgg-sql";
import {
  ddlOf,
  dropDdlOf,
  createTableDdl,
  schemaOf,
} from "plgg-cms/domainCore/Domain/usecase/schemaOf";
import { openSqliteDb } from "plgg-cms/domainCore/testkit/sqliteDb";
import {
  blogDomain,
  usersEntity,
  postsEntity,
  blogVersion,
} from "plgg-cms/domainCore/testkit/blogDomain";

test("ddlOf is deterministic and emits a table per entity", () =>
  all([
    check(
      ddlOf(blogDomain),
      toBe(ddlOf(blogDomain)),
    ),
    check(
      ddlOf(blogDomain),
      toContain("CREATE TABLE users"),
    ),
    check(
      ddlOf(blogDomain),
      toContain("CREATE TABLE posts"),
    ),
  ]));

test("createTableDdl emits constraints", () =>
  all([
    check(
      createTableDdl(usersEntity),
      toContain("PRIMARY KEY (id)"),
    ),
    check(
      createTableDdl(usersEntity),
      toContain("email TEXT NOT NULL UNIQUE"),
    ),
    check(
      createTableDdl(usersEntity),
      toContain("bio TEXT"),
    ),
    check(
      createTableDdl(postsEntity),
      toContain(
        "FOREIGN KEY (author_id) REFERENCES users (id)",
      ),
    ),
  ]));

test("dropDdlOf drops in reverse order", () =>
  check(
    dropDdlOf(blogDomain).indexOf("posts") <
      dropDdlOf(blogDomain).indexOf("users"),
    toBe(true),
  ));

test("schemaOf wraps the DDL in a reversible migration", () => {
  const m = schemaOf(blogVersion)(blogDomain);
  return all([
    check(m.name, toBe("blog schema")),
    check(m.up, toContain("CREATE TABLE")),
    check(m.upTransaction, toBe(true)),
    check(
      m.down,
      someThen((down) =>
        check(down, toContain("DROP TABLE")),
      ),
    ),
  ]);
});

test("the derived migration creates a working schema", async () => {
  const db = openSqliteDb();
  const applied = await runScript(db)(
    schemaOf(blogVersion)(blogDomain).up,
  );
  const inserted = await exec(db)(
    sql`INSERT INTO users (id, email) VALUES (${1}, ${"a@b.c"})`,
  );
  return all([
    check(applied, shouldBeOk()),
    check(
      inserted,
      okThen((r) => check(r.changes, toBe(1))),
    ),
  ]);
});
