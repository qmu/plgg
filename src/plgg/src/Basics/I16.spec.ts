import { test, assert } from "vitest";
import {
  asI16,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("asI16 basic validation", () => {
  const result = asI16(box("I16")(1000));
  assert(isOk(result));
  assert(isErr(asI16(40000)));
});
