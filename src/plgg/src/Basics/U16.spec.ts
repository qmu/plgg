import { test, assert } from "vitest";
import {
  asU16,
  isOk,
  isErr,
  newBox,
} from "plgg/index";

test("asU16 basic validation", () => {
  const result = asU16(newBox("U16")(1000));
  assert(isOk(result));
  assert(isErr(asU16(70000)));
});
