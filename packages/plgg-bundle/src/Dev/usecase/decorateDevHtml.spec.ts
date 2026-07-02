import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { decorateDevHtml } from "plgg-bundle/Dev/usecase/decorateDevHtml";
import { LIVE_RELOAD_SCRIPT } from "plgg-bundle/Dev/model/Protocol";

test("decorateDevHtml injects the reload script before </body>", () => {
  const out = decorateDevHtml(
    "<html><body><h1>hi</h1></body></html>",
  );
  return all([
    check(
      out.includes(LIVE_RELOAD_SCRIPT),
      toBe(true),
    ),
    check(
      out.indexOf(LIVE_RELOAD_SCRIPT) <
        out.indexOf("</body>"),
      toBe(true),
    ),
  ]);
});

test("decorateDevHtml appends to a document with no </body>", () => {
  const out = decorateDevHtml("<h1>bare</h1>");
  return all([
    check(
      out.startsWith("<h1>bare</h1>"),
      toBe(true),
    ),
    check(
      out.endsWith(LIVE_RELOAD_SCRIPT),
      toBe(true),
    ),
  ]);
});
