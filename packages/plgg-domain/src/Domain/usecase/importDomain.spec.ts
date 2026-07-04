import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
  shouldBeOk,
} from "plgg-test";
import { none, isOk } from "plgg";
import { runScript } from "plgg-sql";
import { DomainExport } from "plgg-domain/Domain/model/DomainExport";
import { ddlOf } from "plgg-domain/Domain/usecase/schemaOf";
import { exportDomain } from "plgg-domain/Domain/usecase/exportDomain";
import { importDomain } from "plgg-domain/Domain/usecase/importDomain";
import { openSqliteDb } from "plgg-domain/testkit/sqliteDb";
import { blogDomain } from "plgg-domain/testkit/blogDomain";

const seed: DomainExport = {
  manifest: {
    domainVersion: "seed",
    derivationVersion: "1",
    schemaHead: none(),
  },
  entities: [
    {
      entity: "users",
      rows: [
        { id: 1, email: "a@b.c", bio: "hi" },
        { id: 2, email: "x@y.z" },
      ],
    },
    {
      entity: "posts",
      rows: [
        {
          id: 1,
          author_id: 1,
          title: "First",
          published: true,
          created_at:
            "2026-07-04T00:00:00.000Z",
        },
      ],
    },
  ],
};

test("export → import → re-export round-trips with no loss", async () => {
  const db1 = openSqliteDb();
  await runScript(db1)(ddlOf(blogDomain));
  const imported1 = await importDomain(
    db1,
    blogDomain,
  )(seed);
  const exp1 = await exportDomain(
    db1,
    none(),
  )(blogDomain);
  if (!isOk(exp1)) {
    return check(false, toBe(true));
  }
  const db2 = openSqliteDb();
  await runScript(db2)(ddlOf(blogDomain));
  const imported2 = await importDomain(
    db2,
    blogDomain,
  )(exp1.content);
  const exp2 = await exportDomain(
    db2,
    none(),
  )(blogDomain);
  return all([
    check(imported1, shouldBeOk()),
    check(imported2, shouldBeOk()),
    check(
      exp2,
      okThen((e2) =>
        check(e2, toEqual(exp1.content)),
      ),
    ),
  ]);
});

test("importDomain rejects an export naming an unknown entity", async () => {
  const db = openSqliteDb();
  await runScript(db)(ddlOf(blogDomain));
  const bad: DomainExport = {
    manifest: {
      domainVersion: "x",
      derivationVersion: "1",
      schemaHead: none(),
    },
    entities: [
      { entity: "ghosts", rows: [{ id: 1 }] },
    ],
  };
  const result = await importDomain(
    db,
    blogDomain,
  )(bad);
  return check(
    result,
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  );
});
