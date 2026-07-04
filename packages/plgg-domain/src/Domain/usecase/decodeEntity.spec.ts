import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
  shouldBeOk,
} from "plgg-test";
import {
  ok,
  err,
  isSome,
  isNone,
  invalidError,
} from "plgg";
import { asEntity } from "plgg-domain/Domain/model/Entity";
import { decodeEntity } from "plgg-domain/Domain/usecase/decodeEntity";
import {
  usersEntity,
  postsEntity,
} from "plgg-domain/testkit/blogDomain";

test("decodeEntity casts a full row, wrapping nullable in Some", () =>
  check(
    decodeEntity(usersEntity)({
      id: 1,
      email: "a@b.c",
      bio: "hello",
    }),
    okThen((row) =>
      all([
        check(row.id, toBe(1)),
        check(row.email, toBe("a@b.c")),
        check(isSome(row.bio), toBe(true)),
      ]),
    ),
  ));

test("decodeEntity yields None for a missing or null nullable column", () =>
  all([
    check(
      decodeEntity(usersEntity)({
        id: 1,
        email: "a@b.c",
      }),
      okThen((row) =>
        check(isNone(row.bio), toBe(true)),
      ),
    ),
    check(
      decodeEntity(usersEntity)({
        id: 1,
        email: "a@b.c",
        bio: null,
      }),
      okThen((row) =>
        check(isNone(row.bio), toBe(true)),
      ),
    ),
  ]));

test("decodeEntity fails on a missing required column", () =>
  check(
    decodeEntity(usersEntity)({
      email: "a@b.c",
    }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("decodeEntity rejects a non-object row", () =>
  all([
    check(
      decodeEntity(usersEntity)(42),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      decodeEntity(usersEntity)([1, 2]),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("decodeEntity reads SQLite 0/1 as bool and rejects other values", () =>
  all([
    check(
      decodeEntity(postsEntity)({
        id: 1,
        author_id: 1,
        title: "t",
        published: 1,
        created_at:
          "2026-07-04T00:00:00.000Z",
      }),
      okThen((row) =>
        check(row.published, toBe(true)),
      ),
    ),
    check(
      decodeEntity(postsEntity)({
        id: 1,
        author_id: 1,
        title: "t",
        published: "maybe",
        created_at:
          "2026-07-04T00:00:00.000Z",
      }),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("decodeEntity fails when a field caster rejects", () =>
  check(
    decodeEntity(usersEntity)({
      id: "not-an-int",
      email: "a@b.c",
    }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("decodeEntity runs entity invariants", () =>
  check(
    asEntity({
      name: "flag",
      fields: [{ name: "n", kind: "int" }],
      invariants: [
        (row) =>
          typeof row.n === "number" &&
          row.n > 0
            ? ok(row)
            : err(
                invalidError({
                  message: "n must be positive",
                }),
              ),
      ],
    }),
    okThen((e) =>
      all([
        check(
          decodeEntity(e)({ n: 5 }),
          shouldBeOk(),
        ),
        check(
          decodeEntity(e)({ n: -1 }),
          errThen((err2) =>
            check(
              err2.__tag,
              toBe("InvalidError"),
            ),
          ),
        ),
      ]),
    ),
  ));
