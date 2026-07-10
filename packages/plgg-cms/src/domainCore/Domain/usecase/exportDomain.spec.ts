import {
  test,
  check,
  all,
  toBe,
  toHaveLength,
  okThen,
} from "plgg-test";
import { none } from "plgg";
import { runScript, exec, sql } from "plgg-sql";
import { fingerprintDomain } from "plgg-cms/domainCore/Domain/model/DomainManifest";
import { ddlOf } from "plgg-cms/domainCore/Domain/usecase/schemaOf";
import { exportDomain } from "plgg-cms/domainCore/Domain/usecase/exportDomain";
import { openSqliteDb } from "plgg-cms/domainCore/testkit/sqliteDb";
import { blogDomain } from "plgg-cms/domainCore/testkit/blogDomain";

/** Read the exported rows of one entity. */
const rowsOf = (
  exp: {
    entities: ReadonlyArray<{
      entity: string;
      rows: ReadonlyArray<
        Readonly<Record<string, unknown>>
      >;
    }>;
  },
  name: string,
): ReadonlyArray<
  Readonly<Record<string, unknown>>
> =>
  exp.entities.find((e) => e.entity === name)
    ?.rows ?? [];

test("exportDomain reads rows through the casters and omits null columns", async () => {
  const db = openSqliteDb();
  await runScript(db)(ddlOf(blogDomain));
  await exec(db)(
    sql`INSERT INTO users (id, email, bio) VALUES (${1}, ${"a@b.c"}, ${"hi"})`,
  );
  await exec(db)(
    sql`INSERT INTO users (id, email) VALUES (${2}, ${"x@y.z"})`,
  );
  const exported = await exportDomain(
    db,
    none(),
  )(blogDomain);
  return check(
    exported,
    okThen((e) => {
      const users = rowsOf(e, "users");
      return all([
        check(users, toHaveLength(2)),
        check(
          "bio" in (users[0] ?? {}),
          toBe(true),
        ),
        check(
          "bio" in (users[1] ?? {}),
          toBe(false),
        ),
        check(
          e.manifest.domainVersion,
          toBe(fingerprintDomain(blogDomain)),
        ),
      ]);
    }),
  );
});

test("exportDomain of an empty database yields empty entity sections", async () => {
  const db = openSqliteDb();
  await runScript(db)(ddlOf(blogDomain));
  const exported = await exportDomain(
    db,
    none(),
  )(blogDomain);
  return check(
    exported,
    okThen((e) =>
      check(
        e.entities.every(
          (s) => s.rows.length === 0,
        ),
        toBe(true),
      ),
    ),
  );
});
