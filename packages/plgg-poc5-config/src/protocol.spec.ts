import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  type InvalidError,
  pipe,
  matchResult,
} from "plgg";
import {
  type PagesIndex,
  asSessionGrant,
  asPagesIndex,
} from "./protocol.ts";

const isOk = <T>(
  r: Result<T, InvalidError>,
): boolean =>
  pipe(
    r,
    matchResult(
      (): boolean => false,
      (): boolean => true,
    ),
  );

test("asSessionGrant accepts a well-formed grant and rejects a malformed one", () =>
  all([
    check(
      isOk(
        asSessionGrant({
          value: "ek_123",
          expiresAt: 999,
        }),
      ),
      toBe(true),
    ),
    check(
      isOk(
        asSessionGrant({ value: "ek_123" }),
      ),
      toBe(false),
    ),
    check(
      isOk(asSessionGrant("nope")),
      toBe(false),
    ),
  ]));

test("asPagesIndex accepts a path list and rejects a bad shape", () =>
  all([
    check(
      pipe(
        asPagesIndex({
          paths: ["a.md", "b/c.md"],
        }),
        matchResult(
          (): number => -1,
          (i: PagesIndex): number =>
            i.paths.length,
        ),
      ),
      toBe(2),
    ),
    check(
      isOk(asPagesIndex({ paths: "not-array" })),
      toBe(false),
    ),
    check(isOk(asPagesIndex(42)), toBe(false)),
  ]));
