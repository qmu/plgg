import {
  test,
  check,
  all,
  toBe,
  okThen,
  shouldBeErr,
} from "plgg-test";
import { isSome, isNone } from "plgg";
import {
  type ListQuery,
  asListQuery,
  defaultLimit,
} from "plgg-cms/content/Query/model/ListQuery";

test("an empty bag yields the defaults", () =>
  check(
    asListQuery({}),
    okThen((q: ListQuery) =>
      all([
        toBe(defaultLimit)(q.limit),
        toBe(0)(q.offset),
        toBe("updated_at")(q.orderBy),
        toBe("desc")(q.orderDir),
        toBe(true)(isNone(q.q)),
      ]),
    ),
  ));

test("valid params parse through", () =>
  check(
    asListQuery({
      limit: "10",
      offset: "5",
      orderBy: "title",
      order: "asc",
      q: "hello",
    }),
    okThen((q: ListQuery) =>
      all([
        toBe(10)(q.limit),
        toBe(5)(q.offset),
        toBe("title")(q.orderBy),
        toBe("asc")(q.orderDir),
        toBe(true)(isSome(q.q)),
      ]),
    ),
  ));

test("explicit updated_at / desc parse through", () =>
  check(
    asListQuery({
      orderBy: "updated_at",
      order: "desc",
    }),
    okThen((q: ListQuery) =>
      all([
        toBe("updated_at")(q.orderBy),
        toBe("desc")(q.orderDir),
      ]),
    ),
  ));

test("a whitespace-only q is treated as absent", () =>
  check(
    asListQuery({ q: "   " }),
    okThen((q: ListQuery) =>
      toBe(true)(isNone(q.q)),
    ),
  ));

test("an over-max limit is rejected, not clamped", () =>
  check(
    asListQuery({ limit: "9999" }),
    shouldBeErr(),
  ));

test("a non-numeric limit is rejected", () =>
  check(
    asListQuery({ limit: "lots" }),
    shouldBeErr(),
  ));

test("a negative offset is rejected", () =>
  check(
    asListQuery({ offset: "-1" }),
    shouldBeErr(),
  ));

test("an unknown orderBy is rejected", () =>
  check(
    asListQuery({ orderBy: "secret" }),
    shouldBeErr(),
  ));

test("an unknown order direction is rejected", () =>
  check(
    asListQuery({ order: "sideways" }),
    shouldBeErr(),
  ));
