import { test, expect, assert } from "vitest";
import { asI32, isOk, isErr, newBox } from "plgg/index";

test("asI32 basic validation", () => {
  const result = asI32(newBox("I32")(100000));
  assert(isOk(result));
  assert(isErr(asI32(3000000000)));
});
