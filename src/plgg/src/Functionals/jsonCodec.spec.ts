import { test, expect, assert } from "vitest";
import {
  decodeJson,
  encodeJson,
  isOk,
  isErr,
  InvalidError,
} from "plgg/index";

test("decodeJson parses valid JSON into Ok", () => {
  const r = decodeJson('{"name":"Ada","n":7}');
  assert(isOk(r));
  expect(r.content).toEqual({ name: "Ada", n: 7 });
});

test("decodeJson lifts a parse failure into an InvalidError", () => {
  const r = decodeJson("not json");
  assert(isErr(r));
  expect(r.content).toBeInstanceOf(InvalidError);
  expect(r.content.message.length).toBeGreaterThan(0);
});

test("encodeJson serializes a value into Ok", () => {
  const r = encodeJson({ a: 1, b: [2, 3] });
  assert(isOk(r));
  expect(r.content).toBe('{"a":1,"b":[2,3]}');
});

test("encodeJson lifts a non-serializable value into an InvalidError", () => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  const r = encodeJson(cyclic);
  assert(isErr(r));
  expect(r.content).toBeInstanceOf(InvalidError);
});

test("decodeJson then encodeJson round-trips a value", () => {
  const decoded = decodeJson('{"x":1}');
  assert(isOk(decoded));
  const encoded = encodeJson(decoded.content);
  assert(isOk(encoded));
  expect(encoded.content).toBe('{"x":1}');
});
