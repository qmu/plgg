import { test, expect, assert } from "vitest";
import { asU32, isOk, isErr, newBox } from "plgg/index";

test("asU32 basic validation", () => {
  const result = asU32(newBox("U32")(100000));
  assert(isOk(result));
  assert(isErr(asU32(5000000000)));
});
