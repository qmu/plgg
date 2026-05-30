import { test, assert } from "vitest";
import {
  asI32,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("asI32 basic validation", () => {
  const result = asI32(box("I32")(100000));
  assert(isOk(result));
  assert(isErr(asI32(3000000000)));
});
