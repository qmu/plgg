import { test, check, toEqual } from "plgg-test";
import { sourcePos } from "plgg-ir-syntax/domain/model/SourcePos";

test("sourcePos builds the position record", () =>
  check(
    sourcePos(5, 2, 3),
    toEqual({ offset: 5, line: 2, column: 3 }),
  ));
