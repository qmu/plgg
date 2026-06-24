import {
  test,
  check,
  all,
  shouldBeOk,
  shouldBeErr,
} from "plgg-test";
import { asI16, box } from "plgg/index";

test("asI16 basic validation", () =>
  all([
    check(asI16(box("I16")(1000)), shouldBeOk()),
    check(asI16(40000), shouldBeErr()),
  ]));
