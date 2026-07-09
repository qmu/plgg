import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { match, isOk } from "plgg";
import { runScript } from "plgg-sql";
import {
  type SchemaCheck,
  schemaOk$,
  schemaLag$,
  schemaDrift$,
} from "plgg-cms/domainCore/Domain/model/Mismatch";
import {
  ddlOf,
  createTableDdl,
} from "plgg-cms/domainCore/Domain/usecase/schemaOf";
import { assertPersistedSchema } from "plgg-cms/domainCore/Domain/usecase/assertPersistedSchema";
import { openSqliteDb } from "plgg-cms/domainCore/testkit/sqliteDb";
import {
  blogDomain,
  postsEntity,
  blogVersion,
} from "plgg-cms/domainCore/testkit/blogDomain";

/** The tag of a schema-check result. */
const tag = (c: SchemaCheck): string =>
  match(c)(
    [schemaOk$(), () => "ok"],
    [schemaLag$(), () => "lag"],
    [schemaDrift$(), () => "drift"],
  );

/** The forward migration's up DDL from a lag result (empty otherwise). */
const lagUp = (c: SchemaCheck): string =>
  match(c)(
    [
      schemaLag$(),
      ({ content }) => content.migration.up,
    ],
    [schemaOk$(), () => ""],
    [schemaDrift$(), () => ""],
  );

test("returns Ok when the live schema matches the domain", async () => {
  const db = openSqliteDb();
  await runScript(db)(ddlOf(blogDomain));
  const result = await assertPersistedSchema(
    db,
    blogVersion,
  )(blogDomain);
  return check(
    result,
    okThen((c) => check(tag(c), toBe("ok"))),
  );
});

test("returns Lag with a forward migration that repairs an empty database", async () => {
  const db = openSqliteDb();
  const first = await assertPersistedSchema(
    db,
    blogVersion,
  )(blogDomain);
  if (!isOk(first)) {
    return check(false, toBe(true));
  }
  await runScript(db)(lagUp(first.content));
  const second = await assertPersistedSchema(
    db,
    blogVersion,
  )(blogDomain);
  return all([
    check(tag(first.content), toBe("lag")),
    check(
      second,
      okThen((c) => check(tag(c), toBe("ok"))),
    ),
  ]);
});

test("Lag repairs a table that is missing a column", async () => {
  const db = openSqliteDb();
  await runScript(db)(
    "CREATE TABLE users (id INTEGER NOT NULL, email TEXT NOT NULL UNIQUE, PRIMARY KEY (id));",
  );
  const first = await assertPersistedSchema(
    db,
    blogVersion,
  )(blogDomain);
  if (!isOk(first)) {
    return check(false, toBe(true));
  }
  await runScript(db)(lagUp(first.content));
  const second = await assertPersistedSchema(
    db,
    blogVersion,
  )(blogDomain);
  return all([
    check(tag(first.content), toBe("lag")),
    check(
      second,
      okThen((c) => check(tag(c), toBe("ok"))),
    ),
  ]);
});

test("returns Drift on an incompatible column type", async () => {
  const db = openSqliteDb();
  await runScript(db)(
    "CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, bio TEXT);",
  );
  await runScript(db)(
    createTableDdl(postsEntity),
  );
  const result = await assertPersistedSchema(
    db,
    blogVersion,
  )(blogDomain);
  return check(
    result,
    okThen((c) => check(tag(c), toBe("drift"))),
  );
});

test("returns Drift on a primary-key mismatch", async () => {
  const db = openSqliteDb();
  await runScript(db)(
    "CREATE TABLE users (id INTEGER NOT NULL, email TEXT NOT NULL, bio TEXT);",
  );
  await runScript(db)(
    createTableDdl(postsEntity),
  );
  const result = await assertPersistedSchema(
    db,
    blogVersion,
  )(blogDomain);
  return check(
    result,
    okThen((c) => check(tag(c), toBe("drift"))),
  );
});
