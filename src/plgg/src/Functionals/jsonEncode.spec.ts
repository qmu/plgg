import { test, expect, assert } from "vitest";
import {
  jsonEncode,
  jsonDecode,
  isOk,
  isErr,
} from "plgg/index";

test("jsonEncode and jsonDecode handle JSON operations", () => {
  // Example: JSON serialization/deserialization
  const data = { name: "John", age: 30 };

  const encoded = jsonEncode(data);
  expect(encoded).toBe(
    '{\n  "name": "John",\n  "age": 30\n}',
  );

  const decoded = jsonDecode(encoded);
  assert(isOk(decoded));
  expect(decoded.content).toEqual(data);

  const invalidJson = jsonDecode("invalid json");
  assert(isErr(invalidJson));
});
