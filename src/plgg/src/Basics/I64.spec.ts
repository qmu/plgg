import { test, assert } from "vitest";
import {
  asI64,
  isOk,
  isErr,
  newBox,
} from "plgg/index";

test("asI64 basic validation", () => {
  const result = asI64(newBox("I64")(100000000n));
  assert(isOk(result));
  assert(
    isErr(asI64(BigInt("10000000000000000000"))),
  );
});
