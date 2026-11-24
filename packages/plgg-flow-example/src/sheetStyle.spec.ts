import { test, check, toBe } from "plgg-test";
import {
  el,
  text,
  renderToString,
} from "plgg-view";
import { sheetCss } from "plgg-ir-diagram/flowSheet";
import { flowCss } from "plgg-ir-diagram/flow";
import { demoSheetStyle } from "plgg-flow-example/sheetStyle";
test("demo and press share the full board stylesheet", () =>
  check(
    flowCss.includes(sheetCss) &&
      renderToString(demoSheetStyle) ===
        renderToString(
          el("style", [], [text(sheetCss)]),
        ),
    toBe(true),
  ));
