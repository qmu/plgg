import { test, assert } from "plgg-test";
import {
  asU16,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("asU16 basic validation", () => {
  const result = asU16(box("U16")(1000));
  assert(isOk(result));
  assert(isErr(asU16(70000)));
});
