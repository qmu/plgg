import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { some, none } from "plgg";
import { renderToString, text } from "plgg-view";
import {
  stripAttr,
  columnAttr,
  spanAttr,
  strip,
  documentColumn,
} from "plggmatic/Navigate/model/marker";

const rendered = renderToString(
  strip(
    [],
    [
      documentColumn(
        "/concepts/",
        none(),
        [],
        [text("read")],
      ),
    ],
  ),
);

test("the strip and its columns carry the framework markers", () =>
  all([
    check(
      rendered.includes(stripAttr),
      toBe(true),
    ),
    // the column names its own route, so what is on screen
    // is comparable to what the URL says with no side table
    check(
      rendered.includes(
        columnAttr + '="/concepts/"',
      ),
      toBe(true),
    ),
    // and they are still the plggmatic skeleton
    check(
      rendered.includes('class="pm-row'),
      toBe(true),
    ),
    check(
      rendered.includes('class="pm-col'),
      toBe(true),
    ),
  ]));

// A column showing a passage names it on the element, so
// the runtime can compare the screen to the URL by value.
const withSpan = renderToString(
  documentColumn(
    "/concepts/",
    some("a located passage"),
    [],
    [text("read")],
  ),
);

test("a column showing a passage names it on the element", () =>
  all([
    check(
      withSpan.includes(
        spanAttr + '="a located passage"',
      ),
      toBe(true),
    ),
    // and a column showing none carries no such attribute
    check(
      rendered.includes(spanAttr),
      toBe(false),
    ),
  ]));
