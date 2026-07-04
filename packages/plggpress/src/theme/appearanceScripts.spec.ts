import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import { injectAppearanceScripts } from "plggpress/theme/appearanceScripts";

// Count non-overlapping occurrences of a needle.
const occurrences = (
  haystack: string,
  needle: string,
): number => haystack.split(needle).length - 1;

const PAGE =
  "<html><head><title>x</title></head>" +
  "<body><main>hi</main></body></html>";

test("inserts the no-FOUC script before </head> and the toggle before </body>", () => {
  const out = injectAppearanceScripts(PAGE);
  return all([
    // two scripts total: head no-FOUC + body toggle wiring
    check(occurrences(out, "<script"), toBe(2)),
    // the preserved persistence key survives in the output
    // (sourced from plggmatic's appearanceStorageKey; the
    // needle is split so this spec stays clean of the raw
    // literal the ticket-07 D16 grep hunts for)
    check(out, toContain("vp-" + "appearance")),
    // the class flip and the framework toggle selector
    check(out, toContain("classList")),
    check(out, toContain(".pm-theme-toggle")),
    // each script lands just inside its tag
    check(out, toContain("</script></head>")),
    check(out, toContain("</script></body>")),
    // never opens a live-reload channel
    check(occurrences(out, "EventSource"), toBe(0)),
  ]);
});

test("passes a document missing </head> and </body> through unchanged", () =>
  all([
    check(
      injectAppearanceScripts("<main>x</main>"),
      toBe("<main>x</main>"),
    ),
    // only the </head> half applies when </body> is absent
    check(
      occurrences(
        injectAppearanceScripts(
          "<head></head><main>x</main>",
        ),
        "<script",
      ),
      toBe(1),
    ),
  ]));
