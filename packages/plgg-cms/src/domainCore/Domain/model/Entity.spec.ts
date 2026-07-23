import {
  test,
  check,
  all,
  toBe,
  toHaveLength,
  okThen,
  errThen,
} from "plgg-test";
import { ok } from "plgg";
import { sqlIdentString } from "plgg-sql";
import {
  asEntity,
  primaryKeyFields,
} from "plgg-cms/domainCore/Domain/model/Entity";

test("asEntity validates an entity and keeps invariants", () =>
  check(
    asEntity({
      name: "users",
      fields: [
        { name: "id", kind: "int", primaryKey: true },
        { name: "email", kind: "text" },
      ],
      invariants: [(row) => ok(row)],
    }),
    okThen((e) =>
      all([
        check(
          sqlIdentString(e.name),
          toBe("users"),
        ),
        check(e.fields, toHaveLength(2)),
        check(e.invariants, toHaveLength(1)),
        check(
          primaryKeyFields(e),
          toHaveLength(1),
        ),
      ]),
    ),
  ));

test("asEntity rejects an empty field set", () =>
  check(
    asEntity({ name: "empty", fields: [] }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("asEntity rejects duplicate column names", () =>
  check(
    asEntity({
      name: "dup",
      fields: [
        { name: "id", kind: "int" },
        { name: "id", kind: "text" },
      ],
    }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("asEntity rejects an invalid table name", () =>
  check(
    asEntity({
      name: "1nope",
      fields: [{ name: "id", kind: "int" }],
    }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("asEntity surfaces a field validation failure", () =>
  check(
    asEntity({
      name: "users",
      fields: [{ name: "1bad", kind: "int" }],
    }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));
