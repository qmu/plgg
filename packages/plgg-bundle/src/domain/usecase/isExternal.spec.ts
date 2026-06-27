import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isExternal } from "plgg-bundle/domain/usecase/isExternal";

test("isExternal handles a string-array external", () =>
  all([
    check(
      isExternal(["plgg", "node:fs"], "plgg"),
      toBe(true),
    ),
    check(
      isExternal(["plgg"], "plgg-server"),
      toBe(false),
    ),
    check(
      isExternal([], "anything"),
      toBe(false),
    ),
  ]));

test("isExternal handles a RegExp external", () =>
  all([
    check(
      isExternal(/^node:/, "node:stream"),
      toBe(true),
    ),
    check(
      isExternal(/^node:/, "plgg/index"),
      toBe(false),
    ),
  ]));

test("isExternal handles a predicate external", () =>
  all([
    check(
      isExternal(
        (id) => id.startsWith("plgg"),
        "plgg-server/node",
      ),
      toBe(true),
    ),
    check(
      isExternal(
        (id) => id.startsWith("plgg"),
        "./relative",
      ),
      toBe(false),
    ),
  ]));
