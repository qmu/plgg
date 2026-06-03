import { test, expect } from "vitest";
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
  expect(codec.decode(some("hi"))).toBe("hi");
  expect(codec.decode(none())).toBe("");
  expect(codec.encode("hi")).toEqual(some("hi"));
  expect(codec.encode("")).toEqual(none());
});

test("queryInt parses integers, falling back on missing/malformed", () => {
  const codec = queryInt(1);
  expect(codec.decode(some("42"))).toBe(42);
  expect(codec.decode(some("nope"))).toBe(1);
  expect(codec.decode(some("3.5"))).toBe(1);
  expect(codec.decode(none())).toBe(1);
  expect(codec.encode(42)).toEqual(some("42"));
  expect(codec.encode(1)).toEqual(none());
});

test("queryBool reads true/false, omitting the default", () => {
  const codec = queryBool(false);
  expect(codec.decode(some("true"))).toBe(true);
  expect(codec.decode(some("false"))).toBe(false);
  expect(codec.decode(none())).toBe(false);
  expect(codec.encode(true)).toEqual(
    some("true"),
  );
  expect(codec.encode(false)).toEqual(none());
});

test("queryEnum keeps known values and falls back otherwise", () => {
  const codec = queryEnum(
    ["all", "active", "done"],
    "all",
  );
  expect(codec.decode(some("active"))).toBe(
    "active",
  );
  expect(codec.decode(some("bogus"))).toBe("all");
  expect(codec.decode(none())).toBe("all");
  expect(codec.encode("active")).toEqual(
    some("active"),
  );
  expect(codec.encode("all")).toEqual(none());
});

test("writeField yields a one-entry dict or an empty one", () => {
  expect(writeField("q", some("x"))).toEqual({
    q: "x",
  });
  expect(writeField("q", none())).toEqual({});
});

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
  // decode∘encode is identity on non-default values
  expect(
    codec.decode(codec.encode(value)),
  ).toEqual(value);
  // defaults are omitted entirely
  expect(
    codec.encode({ filter: "all", q: "" }),
  ).toEqual({});
});
