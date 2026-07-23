import {
  test,
  check,
  all,
  toEqual,
} from "plgg-test";
import {
  buildLineIndex,
  posAt,
  rangeAt,
} from "plgg-ir-syntax/domain/model/LineIndex";

test("buildLineIndex records every line start", () =>
  all([
    check(buildLineIndex(""), toEqual([0])),
    check(buildLineIndex("ab"), toEqual([0])),
    check(
      buildLineIndex("a\nbc\n"),
      toEqual([0, 2, 5]),
    ),
  ]));

test("posAt converts offsets to 1-based line/column", () =>
  all([
    check(
      posAt(buildLineIndex("a\nbc"))(0),
      toEqual({ offset: 0, line: 1, column: 1 }),
    ),
    check(
      posAt(buildLineIndex("a\nbc"))(2),
      toEqual({ offset: 2, line: 2, column: 1 }),
    ),
    check(
      posAt(buildLineIndex("a\nbc"))(3),
      toEqual({ offset: 3, line: 2, column: 2 }),
    ),
    // one past the end still resolves (EOF ranges)
    check(
      posAt(buildLineIndex("a\nbc"))(4),
      toEqual({ offset: 4, line: 2, column: 3 }),
    ),
  ]));

test("rangeAt converts an offset pair to a range", () =>
  check(
    rangeAt(buildLineIndex("ab\ncd"))(1, 4),
    toEqual({
      start: { offset: 1, line: 1, column: 2 },
      end: { offset: 4, line: 2, column: 2 },
    }),
  ));
