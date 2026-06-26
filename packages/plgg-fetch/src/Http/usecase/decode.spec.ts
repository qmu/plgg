import {
  test,
  check,
  toBe,
  toContain,
  okThen,
  errThen,
  shouldBeErr,
} from "plgg-test";
import {
  Obj,
  Result,
  InvalidError,
  SoftStr,
  cast,
  asObj,
  asSoftStr,
  forProp,
} from "plgg";
import {
  HttpResponse,
  statusOf,
  bytesBody,
} from "plgg-http";
import { decodeJsonBody } from "plgg-fetch/index";

type User = Obj<{ name: SoftStr }>;

const asUser = (
  value: unknown,
): Result<User, InvalidError> =>
  cast(
    value,
    asObj,
    forProp("name", (x) => cast(x, asSoftStr)),
  );

const responseWith = (
  body: HttpResponse["body"],
): HttpResponse => ({
  status: statusOf(200),
  headers: {},
  body,
});

test("decodeJsonBody parses a JSON body into a typed value", () =>
  check(
    decodeJsonBody(asUser)(
      responseWith('{"name":"Ada"}'),
    ),
    okThen((u) => check(u.name, toBe("Ada"))),
  ));

test("decodeJsonBody surfaces a JSON syntax error as InvalidError", () =>
  check(
    decodeJsonBody(asUser)(
      responseWith("not json"),
    ),
    shouldBeErr(),
  ));

test("decodeJsonBody surfaces a shape mismatch as InvalidError", () =>
  check(
    decodeJsonBody(asUser)(
      responseWith('{"name":123}'),
    ),
    shouldBeErr(),
  ));

test("decodeJsonBody rejects a non-text (bytes) body", () =>
  check(
    decodeJsonBody(asUser)(
      responseWith(
        bytesBody(new Uint8Array([1, 2])),
      ),
    ),
    errThen((e) =>
      check(
        e.content.message,
        toContain("not text"),
      ),
    ),
  ));
