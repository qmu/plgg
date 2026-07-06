import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
  someThen,
  shouldBeNone,
} from "plgg-test";
import {
  Result,
  InvalidError,
  ok,
  isOk,
} from "plgg";
import { sqlIdentString } from "plgg-sql";
import { asField } from "plgg-domain/Domain/model/Field";

test("asField validates a plain field with default attributes", () =>
  check(
    asField({ name: "title", kind: "text" }),
    okThen((f) =>
      all([
        check(
          sqlIdentString(f.name),
          toBe("title"),
        ),
        check(f.kind, toBe("text")),
        check(f.primaryKey, toBe(false)),
        check(f.nullable, toBe(false)),
        check(f.unique, toBe(false)),
        check(f.references, shouldBeNone()),
      ]),
    ),
  ));

test("asField carries persistence flags", () =>
  check(
    asField({
      name: "id",
      kind: "int",
      primaryKey: true,
      unique: true,
    }),
    okThen((f) =>
      all([
        check(f.primaryKey, toBe(true)),
        check(f.unique, toBe(true)),
      ]),
    ),
  ));

test("asField rejects an invalid identifier", () =>
  check(
    asField({ name: "1bad", kind: "text" }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("asField validates a foreign-key reference", () =>
  check(
    asField({
      name: "author_id",
      kind: "int",
      references: {
        entity: "users",
        field: "id",
      },
    }),
    okThen((f) =>
      check(
        f.references,
        someThen((r) =>
          all([
            check(
              sqlIdentString(r.entity),
              toBe("users"),
            ),
            check(
              sqlIdentString(r.field),
              toBe("id"),
            ),
          ]),
        ),
      ),
    ),
  ));

test("asField rejects a reference with a bad identifier", () =>
  check(
    asField({
      name: "author_id",
      kind: "int",
      references: {
        entity: "9users",
        field: "id",
      },
    }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("asField applies a brand caster over the base kind", () => {
  const upper = (
    v: unknown,
  ): Result<string, InvalidError> =>
    ok(String(v).toUpperCase());
  return check(
    asField({
      name: "code",
      kind: "text",
      brand: upper,
    }),
    okThen((f) =>
      check(
        isOk(f.as("ab")) &&
          f.as("ab").content === "AB",
        toBe(true),
      ),
    ),
  );
});
