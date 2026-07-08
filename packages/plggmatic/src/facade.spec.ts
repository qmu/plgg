import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  button,
  declare,
  schedule,
  frameworkName,
  themeToggle,
  themeToggleClass,
  themeToggleCss,
  staticThemeToggle,
} from "plggmatic/index";
import {
  schemeCss,
  bg,
  colorVar,
  metricVar,
  syntaxKinds,
} from "plggmatic/styleEntry";

/**
 * plggmatic is a facade over the extracted `plgg-ui`
 * engine (the `plggmatic-extraction-cut` trip, ticket A1).
 * These assertions guard that the re-export chain
 * resolves: the runtime surface and the `themeToggle*`
 * family are reachable from `plggmatic`, and the theme
 * surface from `plggmatic/style`. A broken re-export path
 * (renamed engine symbol, dropped subpath) fails here
 * rather than in a downstream consumer.
 */
test("plggmatic re-exports the plgg-ui runtime surface", () => {
  return all([
    check(button !== undefined, toBe(true)),
    check(declare !== undefined, toBe(true)),
    check(
      schedule !== undefined,
      toBe(true),
    ),
    check(frameworkName, toBe("plggmatic")),
  ]);
});

test("plggmatic keeps the themeToggle* family on its root surface", () => {
  return all([
    check(
      themeToggle !== undefined,
      toBe(true),
    ),
    check(
      themeToggleClass !== undefined,
      toBe(true),
    ),
    check(
      themeToggleCss !== undefined,
      toBe(true),
    ),
    check(
      staticThemeToggle !== undefined,
      toBe(true),
    ),
  ]);
});

test("plggmatic/style re-exports the plgg-ui theme surface", () => {
  return all([
    check(
      schemeCss !== undefined,
      toBe(true),
    ),
    check(bg !== undefined, toBe(true)),
    check(
      colorVar !== undefined,
      toBe(true),
    ),
    check(
      metricVar !== undefined,
      toBe(true),
    ),
    check(
      syntaxKinds !== undefined,
      toBe(true),
    ),
  ]);
});
