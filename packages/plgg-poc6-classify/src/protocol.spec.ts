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

test("asSessionGrant accepts a well-formed grant, rejects malformed", () =>
  all([
    check(
      isOk(
        asSessionGrant({
          value: "ek_1",
          expiresAt: 9,
        }),
      ),
      toBe(true),
    ),
    check(
      isOk(asSessionGrant({ value: "ek_1" })),
      toBe(false),
    ),
  ]));

test("asPagesIndex decodes classified pages and rejects a bad shape", () =>
  all([
    check(
      pipe(
        asPagesIndex({
          pages: [
            {
              path: "a.md",
              tags: ["x"],
              links: [],
            },
          ],
        }),
        matchResult(
          (): number => -1,
          (i: PagesIndex): number =>
            i.pages.length,
        ),
      ),
      toBe(1),
    ),
    check(
      isOk(
        asPagesIndex({
          pages: [{ path: "a.md" }],
        }),
      ),
      toBe(false),
    ),
    check(isOk(asPagesIndex(7)), toBe(false)),
  ]));
