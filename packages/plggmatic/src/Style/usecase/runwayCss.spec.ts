import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { runwayCss } from "plggmatic/Style/usecase/runwayCss";
import { defaultTheme } from "plggmatic/Style/model/theme";

const css = runwayCss(defaultTheme)({
  gap: "1.5rem",
  lastFallback: "220px",
});

// The "depth does not consume the viewport" invariant,
// expressed structurally in the emitted CSS: the strip is a
// HORIZONTAL SCROLL CONTAINER (so added columns grow its
// scroll width, never the row/body width), and the runway is
// a trailing `::after` FLEX SPACER (which occupies scroll
// width, not layout width) sized one column short of the
// strip. Together these are the mechanism by which the column
// strip grows and scrolls while the body/top-bar width stays
// fixed.
test("the strip scrolls horizontally at every width (not just below snap)", () =>
  all([
    check(
      css.includes(
        ".pm-row{--pm-runway-gap:1.5rem;flex:1;min-height:0;height:auto;gap:var(--pm-runway-gap);overflow-x:auto;overflow-y:hidden;}",
      ),
      toBe(true),
    ),
    // NOT gated below a breakpoint — the base rule carries the
    // horizontal scroll unconditionally.
    check(
      css.startsWith(".pm-row{"),
      toBe(true),
    ),
  ]));

test("the runway is a trailing flex spacer sized one column short of the strip", () =>
  all([
    check(
      css.includes("(min-width:900px)"),
      toBe(true),
    ),
    check(
      css.includes(
        '.pm-row::after{content:"";flex:0 0 calc(100% - var(--pm-runway-last,220px) - var(--pm-runway-gap));}',
      ),
      toBe(true),
    ),
    // a FLEX spacer box, never a trailing margin/padding
    // (unreliably counted in a flex scroll container's
    // scroll width).
    check(css.includes("margin"), toBe(false)),
  ]));

test("the runway CSS is escape-safe (survives an SSR escaper)", () =>
  all([
    check(css.includes("<"), toBe(false)),
    check(css.includes(">"), toBe(false)),
    check(css.includes("&"), toBe(false)),
  ]));

test("the runway options and theme prefix flow into the emitted CSS", () =>
  all([
    check(
      runwayCss(defaultTheme)({
        gap: "2rem",
        lastFallback: "300px",
      }).includes(
        "var(--pm-runway-last,300px)",
      ),
      toBe(true),
    ),
    check(
      runwayCss({
        ...defaultTheme,
        prefix: "vp",
      })({
        gap: "1rem",
        lastFallback: "180px",
      }).includes(".vp-row{--vp-runway-gap:1rem;"),
      toBe(true),
    ),
  ]));
