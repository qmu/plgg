import { test, check, toEqual } from "plgg-test";
import { sourcePos } from "plgg-ir-syntax/domain/model/SourcePos";
import { sourceRange } from "plgg-ir-syntax/domain/model/SourceRange";

test("sourceRange builds the half-open span", () =>
  check(
    sourceRange(
      sourcePos(0, 1, 1),
      sourcePos(3, 1, 4),
    ),
    toEqual({
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 3, line: 1, column: 4 },
    }),
  ));
