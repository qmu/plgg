import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { matchOption } from "plgg";
import { parseMigration } from "plgg-db-migration/domain/usecase/parseMigration";

const downOr = matchOption(
  () => "<none>",
  (s: string) => s,
);

test("parses the up and down sections, transactional by default", () =>
  check(
    parseMigration(
      "-- migrate:up\nCREATE TABLE t (id INTEGER);\n\n-- migrate:down\nDROP TABLE t;\n",
    ),
    okThen((m) =>
      all([
        check(
          m.up,
          toBe("CREATE TABLE t (id INTEGER);"),
        ),
        check(
          downOr(m.down),
          toBe("DROP TABLE t;"),
        ),
        check(m.upTransaction, toBe(true)),
        check(m.downTransaction, toBe(true)),
      ]),
    ),
  ));

test("an up-only migration has down = None", () =>
  check(
    parseMigration(
      "-- migrate:up\nINSERT INTO t VALUES (1);\n",
    ),
    okThen((m) =>
      all([
        check(
          m.up,
          toBe("INSERT INTO t VALUES (1);"),
        ),
        check(downOr(m.down), toBe("<none>")),
      ]),
    ),
  ));

test("a missing up section is a ParseFailure", () =>
  check(
    parseMigration(
      "-- migrate:down\nDROP TABLE t;\n",
    ),
    errThen((e) =>
      check(e.content.kind, toBe("ParseFailure")),
    ),
  ));

test("SQL before the first -- migrate:up marker is a ParseFailure (never silently dropped)", () =>
  check(
    parseMigration(
      "CREATE TABLE oops (id INTEGER);\n-- migrate:up\nCREATE TABLE t (id INTEGER);\n",
    ),
    errThen((e) =>
      check(e.content.kind, toBe("ParseFailure")),
    ),
  ));

test("leading blank lines before the up marker are allowed (whitespace, not content)", () =>
  check(
    parseMigration(
      "\n\n-- migrate:up\nCREATE TABLE t (id INTEGER);\n",
    ),
    okThen((m) =>
      check(
        m.up,
        toBe("CREATE TABLE t (id INTEGER);"),
      ),
    ),
  ));

test("an empty up body is allowed and parses to an empty up (explicit no-op)", () =>
  check(
    parseMigration(
      "-- migrate:up\n-- migrate:down\nDROP TABLE t;\n",
    ),
    okThen((m) => check(m.up, toBe(""))),
  ));

test("the transaction:false directive disables wrapping per section", () =>
  check(
    parseMigration(
      "-- migrate:up transaction:false\nCREATE INDEX CONCURRENTLY i ON t (c);\n-- migrate:down transaction:false\nDROP INDEX i;\n",
    ),
    okThen((m) =>
      all([
        check(m.upTransaction, toBe(false)),
        check(m.downTransaction, toBe(false)),
      ]),
    ),
  ));

test("tolerates CRLF and surrounding whitespace around the markers", () =>
  check(
    parseMigration(
      "  --  migrate:up  \r\nCREATE TABLE t (id INTEGER);\r\n  --  migrate:down  \r\nDROP TABLE t;\r\n",
    ),
    okThen((m) =>
      all([
        check(
          m.up,
          toBe("CREATE TABLE t (id INTEGER);"),
        ),
        check(
          downOr(m.down),
          toBe("DROP TABLE t;"),
        ),
      ]),
    ),
  ));
