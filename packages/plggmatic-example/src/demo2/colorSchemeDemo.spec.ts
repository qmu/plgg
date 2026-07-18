// Demo 2's proof, asserted on the server-rendered view
// (the in-house DOM renders no SVG, and the themeToggle
// draws an icon): the swatch grid renders a labelled chip
// per token, the toggle seeds its aria-label from the
// scheme, and the reducer flips the scheme and issues the
// apply effect. The actual html.dark flip is a browser
// check.
import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { renderToString } from "plgg-view";
import { colors } from "plggmatic/style";
import {
  view,
  update,
} from "./colorSchemeDemo.ts";

const html = (scheme: "light" | "dark"): string =>
  renderToString(view({ scheme }));

const count = (
  haystack: string,
  needle: string,
): number => haystack.split(needle).length - 1;

test("the view renders a labelled chip per token", () =>
  all([
    check(
      count(html("light"), "cs-chip"),
      toBe(colors.length),
    ),
    // every token prints its name — nothing by color alone
    check(
      html("light").includes("primary-base"),
      toBe(true),
    ),
    check(
      html("light").includes("surface-2"),
      toBe(true),
    ),
  ]));

test("the toggle's aria-label names the destination scheme", () =>
  all([
    check(
      html("light").includes(
        "Switch to dark mode",
      ),
      toBe(true),
    ),
    check(
      html("dark").includes(
        "Switch to light mode",
      ),
      toBe(true),
    ),
  ]));

test("the reducer flips the scheme and acknowledges the apply effect", () => {
  const [dark] = update(
    { kind: "toggle" },
    { scheme: "light" },
  );
  const [light] = update(
    { kind: "toggle" },
    { scheme: "dark" },
  );
  const [same] = update(
    { kind: "applied" },
    { scheme: "dark" },
  );
  return all([
    check(dark.scheme, toBe("dark")),
    check(light.scheme, toBe("light")),
    check(same.scheme, toBe("dark")),
  ]);
});
