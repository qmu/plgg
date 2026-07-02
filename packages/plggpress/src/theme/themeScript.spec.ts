import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import { injectThemeScripts } from "plggpress/theme/themeScript";

// Count non-overlapping occurrences of a needle.
const occurrences = (
  haystack: string,
  needle: string,
): number => haystack.split(needle).length - 1;

const PAGE =
  "<html><head><title>x</title></head>" +
  "<body><main>hi</main></body></html>";

test("inserts the no-FOUC script before </head> and the toggle before </body>", () => {
  const out = injectThemeScripts(PAGE);
  return all([
    // two scripts total: head no-FOUC + body toggle
    check(occurrences(out, "<script"), toBe(2)),
    // the persistence key and the class flip survive
    check(out, toContain("vp-appearance")),
    check(out, toContain("classList")),
    // wired to the header toggle button
    check(out, toContain(".vp-theme-toggle")),
    // each script lands just inside its tag
    check(out, toContain("</script></head>")),
    check(out, toContain("</script></body>")),
    // never opens a live-reload channel
    check(
      occurrences(out, "EventSource"),
      toBe(0),
    ),
  ]);
});

test("passes a document missing </head> and </body> through unchanged", () =>
  all([
    check(
      injectThemeScripts("<main>x</main>"),
      toBe("<main>x</main>"),
    ),
    // only the </head> half applies when </body> is absent
    check(
      occurrences(
        injectThemeScripts(
          "<head></head><main>x</main>",
        ),
        "<script",
      ),
      toBe(1),
    ),
  ]));
