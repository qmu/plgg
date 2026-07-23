import {
  test,
  check,
  all,
  shouldBeOk,
  shouldBeErr,
} from "plgg-test";
import { asI32, box } from "plgg/index";

test("asI32 basic validation", () =>
  all([
    check(
      asI32(box("I32")(100000)),
      shouldBeOk(),
    ),
    check(asI32(3000000000), shouldBeErr()),
  ]));
