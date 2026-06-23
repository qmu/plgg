import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { isInt, asInt, isErr } from "plgg/index";

test("isInt and asInt basic validation", () =>
  all([
    check(isInt(42), toBe(true)),
    check(asInt(100), okThen(toBe(100))),
    check(isErr(asInt(3.14)), toBe(true)),
  ]));
