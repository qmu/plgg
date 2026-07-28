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
        false,
      ),
      toContain("EventSource"),
    ),
    // the script lands INSIDE the body, before the close tag
    check(
      decorateDevHtml(
        "<html><body>hi</body></html>",
        false,
      ),
      toContain("</script></body>"),
    ),
  ]));

test("appends the client when the document has no </body>", () =>
  all([
    check(
      decorateDevHtml("<p>bare</p>", false),
      toContain("<p>bare</p>"),
    ),
    check(
      decorateDevHtml("<p>bare</p>", false),
      toContain("EventSource"),
    ),
  ]));

test("adds the voice module script only when voice is on", () =>
  all([
    check(
      decorateDevHtml("<p>bare</p>", true),
      toContain(
        "/__plggpress_voice/module/voiceClient",
      ),
    ),
    check(
      decorateDevHtml("<p>bare</p>", true),
      toContain("EventSource"),
    ),
  ]));
