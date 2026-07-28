import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { renderToString, text } from "plgg-view";
import {
  stripAttr,
  columnAttr,
  strip,
  documentColumn,
} from "plggmatic/Navigate/model/marker";

const rendered = renderToString(
  strip(
    [],
    [
      documentColumn(
        "/concepts/",
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
