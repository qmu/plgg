import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import { defaultTheme } from "plggmatic/Style";
import {
  shareCss,
  shareOptions,
} from "plggmatic/Style/usecase/shareCss";

const css = shareCss(defaultTheme)(shareOptions);

test("a window holds one column, then two from 960px, then three from 1760px", () =>
  all([
    check(
      css,
      toContain(".pm-share{--pm-share-n:1;}"),
    ),
    check(
      css,
      toContain(
        "@media (min-width:960px){.pm-share{--pm-share-n:2;}}",
      ),
    ),
    check(
      css,
      toContain(
        "@media (min-width:1760px){.pm-share{--pm-share-n:3;}}",
      ),
    ),
  ]));

test("a column's basis is one share of the room; it grows to fill and never shrinks", () =>
  check(
    css,
    toContain(
      ".pm-share [data-pm-column]{flex:1 0 calc((100% - var(--pm-share-inset,0px)) / var(--pm-share-n));width:auto;min-width:0;}",
    ),
  ));

test("a span-2 column takes two shares, never more than the room", () =>
  check(
    css,
    toContain(
      ".pm-share [data-pm-column].pm-span-2{flex-basis:min((100% - var(--pm-share-inset,0px)),calc((100% - var(--pm-share-inset,0px)) / var(--pm-share-n) * 2));}",
    ),
  ));

test("a product may state its own capacity, and the sheet stays escape-safe", () =>
  all([
    check(
      shareCss(defaultTheme)({
        steps: [{ min: "70rem", columns: 4 }],
      }),
      toContain(
        "@media (min-width:70rem){.pm-share{--pm-share-n:4;}}",
      ),
    ),
    check(/[<>&]/.test(css), toBe(false)),
  ]));
