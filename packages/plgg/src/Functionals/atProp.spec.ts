import { test, expect, assert } from "plgg-test";
import { atProp, isOk, isErr } from "plgg/index";

test("atProp returns Ok for existing property", () => {
  const result = atProp("name")({
    name: "Alice",
    age: 30,
  });
  assert(isOk(result));
  expect(result.content).toBe("Alice");
});

test("atProp returns nested object value", () => {
  const nested = { a: 1 };
  const result = atProp("data")({ data: nested });
  assert(isOk(result));
  expect(result.content).toBe(nested);
});

test("atProp returns Err for missing property", () => {
  const result = atProp("missing")({ present: 1 });
  assert(isErr(result));
  expect(result.content.content.message).toContain(
    "Cannot access property 'missing'",
  );
});

test("atProp returns Err for non-object value", () => {
  const result = atProp("name")("not-object");
  assert(isErr(result));
  expect(result.content.content.message).toContain(
    "Cannot access property 'name'",
  );
});

test("atProp returns Err for null", () => {
  const result = atProp("name")(null);
  assert(isErr(result));
});

test("atProp returns Err for undefined", () => {
  const result = atProp("name")(undefined);
  assert(isErr(result));
});
