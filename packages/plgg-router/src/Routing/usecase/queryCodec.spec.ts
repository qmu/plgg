import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  SoftStr,
  some,
  none,
  fromNullable,
} from "plgg";
import {
  QueryCodec,
  queryStr,
  queryInt,
  queryBool,
  queryEnum,
  writeField,
} from "plgg-router/Routing/usecase/queryCodec";

test("queryStr decodes the token or falls back, omitting the default", () => {
  const codec = queryStr("");
  return all([
    check(codec.decode(some("hi")), toBe("hi")),
    check(codec.decode(none()), toBe("")),
    check(
      codec.encode("hi"),
      toEqual(some("hi")),
    ),
    check(codec.encode(""), toEqual(none())),
  ]);
});

test("queryInt parses integers, falling back on missing/malformed", () => {
  const codec = queryInt(1);
  return all([
    check(codec.decode(some("42")), toBe(42)),
    check(codec.decode(some("nope")), toBe(1)),
    check(codec.decode(some("3.5")), toBe(1)),
    check(codec.decode(none()), toBe(1)),
    check(codec.encode(42), toEqual(some("42"))),
    check(codec.encode(1), toEqual(none())),
  ]);
});

test("queryBool reads true/false, omitting the default", () => {
  const codec = queryBool(false);
  return all([
    check(codec.decode(some("true")), toBe(true)),
    check(
      codec.decode(some("false")),
      toBe(false),
    ),
    check(codec.decode(none()), toBe(false)),
    check(
      codec.encode(true),
      toEqual(some("true")),
    ),
    check(codec.encode(false), toEqual(none())),
  ]);
});

test("queryEnum keeps known values and falls back otherwise", () => {
  const codec = queryEnum(
    ["all", "active", "done"],
    "all",
  );
  return all([
    check(
      codec.decode(some("active")),
      toBe("active"),
    ),
    check(
      codec.decode(some("bogus")),
      toBe("all"),
    ),
    check(codec.decode(none()), toBe("all")),
    check(
      codec.encode("active"),
      toEqual(some("active")),
    ),
    check(codec.encode("all"), toEqual(none())),
  ]);
});

test("writeField yields a one-entry dict or an empty one", () =>
  all([
    check(
      writeField("q", some("x")),
      toEqual({ q: "x" }),
    ),
    check(writeField("q", none()), toEqual({})),
  ]));

test("field codecs compose into a typed QueryCodec round-trip", () => {
  type Slice = Readonly<{
    filter: "all" | "active" | "done";
    q: SoftStr;
  }>;
  const filter = queryEnum(
    ["all", "active", "done"],
    "all",
  );
  const q = queryStr("");
  const codec: QueryCodec<Slice> = {
    decode: (query) => ({
      filter: filter.decode(
        fromNullable(query["filter"]),
      ),
      q: q.decode(fromNullable(query["q"])),
    }),
    encode: (value) => ({
      ...writeField(
        "filter",
        filter.encode(value.filter),
      ),
      ...writeField("q", q.encode(value.q)),
    }),
  };
  const value: Slice = {
    filter: "active",
    q: "milk",
  };
  return all([
    // decode∘encode is identity on non-default values
    check(
      codec.decode(codec.encode(value)),
      toEqual(value),
    ),
    // defaults are omitted entirely
    check(
      codec.encode({ filter: "all", q: "" }),
      toEqual({}),
    ),
  ]);
});
