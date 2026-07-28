import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  stripAttr,
  columnAttr,
  navHookName,
} from "plggmatic/Navigate/model/marker";
import {
  restParam,
  spanParam,
  entrySeparator,
  fieldSeparator,
  escapeChar,
} from "plggmatic/Navigate/usecase/compositionUrl";
import {
  navigationInitScript,
  injectNavigationScript,
} from "plggmatic/Navigate/usecase/navigationScript";

const embeds = (value: string): boolean =>
  navigationInitScript.includes(
    JSON.stringify(value),
  );

test("the runtime is composed from the exported constants, never re-typed", () =>
  all([
    check(embeds(stripAttr), toBe(true)),
    check(embeds(columnAttr), toBe(true)),
    check(embeds(navHookName), toBe(true)),
    check(embeds(restParam), toBe(true)),
    check(embeds(spanParam), toBe(true)),
    check(embeds(entrySeparator), toBe(true)),
    check(embeds(fieldSeparator), toBe(true)),
    check(embeds(escapeChar), toBe(true)),
  ]));

test("the runtime is safe to inline in a <script> element", () =>
  all([
    // an inner `</script` would close the element early
    check(
      navigationInitScript.includes("</script"),
      toBe(false),
    ),
    // and it is a self-invoking unit, leaking only the hook
    check(
      navigationInitScript.startsWith(
        "(function(){",
      ),
      toBe(true),
    ),
  ]));

test("the runtime leaves to the browser what the browser does better", () =>
  all([
    // a modified click must still open a tab
    check(
      navigationInitScript.includes("ev.metaKey"),
      toBe(true),
    ),
    // a download must still download
    check(
      navigationInitScript.includes("download"),
      toBe(true),
    ),
    // an off-site link must still leave
    check(
      navigationInitScript.includes("a.origin"),
      toBe(true),
    ),
    // and a same-page fragment must still jump in place
    check(
      navigationInitScript.includes("a.hash"),
      toBe(true),
    ),
  ]));

test("injection lands once, before </body>", () => {
  const page =
    "<html><body><div></div></body></html>";
  const injected = injectNavigationScript(page);
  return all([
    check(
      injected.split("<script>").length - 1,
      toBe(1),
    ),
    check(
      injected.indexOf("<script>") <
        injected.indexOf("</body>"),
      toBe(true),
    ),
  ]);
});

test("a page with no </body> passes through unchanged", () =>
  check(
    injectNavigationScript("<div>fragment</div>"),
    toBe("<div>fragment</div>"),
  ));
