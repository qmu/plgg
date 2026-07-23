import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { chromeCss as chromeCssFor } from "plggpress/themeSupport/Style/usecase/chromeCss";
import { defaultTheme } from "plggpress/themeSupport/Style/model/theme";

// The default theme reproduces the pre-parameterization
// chrome CSS byte-for-byte.
const chromeCss = chromeCssFor(defaultTheme);

test("the chrome CSS is escape-safe (survives an SSR escaper)", () =>
  all([
    check(chromeCss.includes("<"), toBe(false)),
    check(chromeCss.includes(">"), toBe(false)),
    check(chromeCss.includes("&"), toBe(false)),
  ]));

test("media boundaries come from the snap breakpoint builders", () =>
  all([
    check(
      chromeCss.includes("(min-width:900px)"),
      toBe(true),
    ),
    check(
      chromeCss.includes("(max-width:899px)"),
      toBe(true),
    ),
  ]));

test("colors are --pm-* variables and dimensions are tokens", () =>
  all([
    check(
      chromeCss.includes("var(--pm-surface)"),
      toBe(true),
    ),
    check(
      chromeCss.includes(
        "var(--pm-primary-base)",
      ),
      toBe(true),
    ),
    // per-column scroll uses the chrome-rail metric var,
    // never a raw 48px literal
    check(
      chromeCss.includes("var(--pm-rail)"),
      toBe(true),
    ),
    check(chromeCss.includes("48px"), toBe(false)),
  ]));

test("class hooks are cssPrefix-derived", () =>
  all([
    check(
      chromeCss.includes(".pm-colhead"),
      toBe(true),
    ),
    check(
      chromeCss.includes(
        '.pm-pane a[aria-current="page"]',
      ),
      toBe(true),
    ),
    check(
      chromeCss.includes(".ex-"),
      toBe(false),
    ),
  ]));
