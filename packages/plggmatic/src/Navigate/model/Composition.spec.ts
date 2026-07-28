import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { some, isNone, isSome } from "plgg";
import {
  type Column,
  columnOf,
  columnWithSpan,
  soloComposition,
  columnsOf,
} from "plggmatic/Navigate/model/Composition";

test("a column with no marked passage carries None", () =>
  check(
    isNone(columnOf("/core/").span),
    toBe(true),
  ));

test("a marked column carries its verbatim span", () =>
  all([
    check(
      isSome(
        columnWithSpan(
          "/core/",
          some("a passage"),
        ).span,
      ),
      toBe(true),
    ),
    check(
      columnWithSpan("/core/", some("a passage"))
        .route,
      toBe("/core/"),
    ),
  ]));

test("a solo composition is one column and nothing else", () =>
  all([
    check(
      soloComposition("/").head.route,
      toBe("/"),
    ),
    check(
      soloComposition("/").rest.length,
      toBe(0),
    ),
  ]));

test("columnsOf flattens head-then-rest, left to right", () =>
  check(
    columnsOf({
      head: columnOf("/a/"),
      rest: [columnOf("/b/"), columnOf("/c/")],
    })
      .map((column: Column) => column.route)
      .join(" "),
    toBe("/a/ /b/ /c/"),
  ));
