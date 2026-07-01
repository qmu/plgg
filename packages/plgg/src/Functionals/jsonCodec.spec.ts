import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toBeGreaterThan,
  okThen,
  errThen,
} from "plgg-test";
import {
  decodeJson,
  encodeJson,
} from "plgg/index";

test("decodeJson parses valid JSON into Ok", () =>
  check(
    decodeJson('{"name":"Ada","n":7}'),
    okThen(toEqual({ name: "Ada", n: 7 })),
  ));

test("decodeJson lifts a parse failure into an InvalidError", () =>
  check(
    decodeJson("not json"),
    errThen((e) =>
      all([
        check(e.__tag, toBe("InvalidError")),
        check(
          e.content.message.length,
          toBeGreaterThan(0),
        ),
      ]),
    ),
  ));

test("encodeJson serializes a value into Ok", () =>
  check(
    encodeJson({ a: 1, b: [2, 3] }),
    okThen(toBe('{"a":1,"b":[2,3]}')),
  ));

test("encodeJson lifts a non-serializable value into an InvalidError", () => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  return check(
    encodeJson(cyclic),
    errThen((e) =>
      toBe("InvalidError")(e.__tag),
    ),
  );
});

test("decodeJson then encodeJson round-trips a value", () =>
  check(
    decodeJson('{"x":1}'),
    okThen((decoded) =>
      check(
        encodeJson(decoded),
        okThen(toBe('{"x":1}')),
      ),
    ),
  ));
