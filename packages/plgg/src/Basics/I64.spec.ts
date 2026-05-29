import { test, assert } from "vitest";
import {
  asI64,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("asI64 basic validation", () => {
  const result = asI64(box("I64")(100000000n));
  assert(isOk(result));
  assert(
    isErr(asI64(BigInt("10000000000000000000"))),
  );
});
