import {
  test,
  check,
  all,
  toContain,
} from "plgg-test";
import { decorateDevHtml } from "plggpress/framework/DevServer/usecase/decorateDevHtml";

test("inserts the reload client just before </body>", () =>
  all([
    check(
      decorateDevHtml(
        "<html><body>hi</body></html>",
      ),
      toContain("EventSource"),
    ),
    // the script lands INSIDE the body, before the close tag
    check(
      decorateDevHtml(
        "<html><body>hi</body></html>",
      ),
      toContain("</script></body>"),
    ),
  ]));

test("appends the client when the document has no </body>", () =>
  all([
    check(
      decorateDevHtml("<p>bare</p>"),
      toContain("<p>bare</p>"),
    ),
    check(
      decorateDevHtml("<p>bare</p>"),
      toContain("EventSource"),
    ),
  ]));
