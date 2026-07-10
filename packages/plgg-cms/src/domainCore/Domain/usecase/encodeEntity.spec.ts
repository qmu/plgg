import {
  test,
  check,
  all,
  toBe,
  toHaveLength,
  toContain,
  okThen,
  errThen,
} from "plgg-test";
import { some, none, isNone } from "plgg";
import { sqlIdentString } from "plgg-sql";
import {
  encodeEntity,
  insertSql,
} from "plgg-cms/domainCore/Domain/usecase/encodeEntity";
import { usersEntity } from "plgg-cms/domainCore/testkit/blogDomain";

test("encodeEntity binds every column and builds an INSERT", () =>
  check(
    encodeEntity(usersEntity)({
      id: 1,
      email: "a@b.c",
      bio: some("hi"),
    }),
    okThen((bindings) => {
      const stmt = insertSql(
        usersEntity,
        bindings,
      );
      return all([
        check(bindings, toHaveLength(3)),
        check(
          stmt.content.text,
          toContain("INSERT INTO users"),
        ),
        check(
          stmt.content.params,
          toHaveLength(3),
        ),
      ]);
    }),
  ));

test("encodeEntity binds a None nullable column to SQL NULL", () =>
  check(
    encodeEntity(usersEntity)({
      id: 1,
      email: "a@b.c",
      bio: none(),
    }),
    okThen((bindings) =>
      check(
        bindings.some(
          (b) =>
            sqlIdentString(b.column) === "bio" &&
            isNone(b.param),
        ),
        toBe(true),
      ),
    ),
  ));

test("encodeEntity fails on a missing required column", () =>
  check(
    encodeEntity(usersEntity)({ id: 1 }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));
