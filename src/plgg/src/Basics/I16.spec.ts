import { test, assert } from "vitest";
import {
  asI16,
  isOk,
  isErr,
  newBox,
} from "plgg/index";

test("asI16 basic validation", () => {
  const result = asI16(newBox("I16")(1000));
  assert(isOk(result));
  assert(isErr(asI16(40000)));
});
