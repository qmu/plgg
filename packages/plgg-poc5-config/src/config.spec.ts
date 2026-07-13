import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { pipe, matchOption } from "plgg";
import {
  type TagColor,
  type SizingTheme,
  type Layout,
  TAG_COLORS,
  SIZING_THEMES,
  LAYOUTS,
  colorHex,
  sizingScale,
  sizingThemeLabel,
  layoutLabel,
  layoutColumns,
  asTagColor,
  asSizingTheme,
  asLayout,
  DEFAULT_CONFIG,
} from "./config.ts";

// The closed dials: every literal maps to a value, so the
// exhaustive lookups can never render a hole.

test("every color has a hex", () =>
  all(
    TAG_COLORS.map((c: TagColor) =>
      check(
        colorHex(c).startsWith("#"),
        toBe(true),
      ),
    ),
  ));

test("every sizing theme has a monotone-ish scale and a label", () =>
  all(
    SIZING_THEMES.map((t: SizingTheme) =>
      check(
        sizingScale(t).basePx > 0 &&
          sizingThemeLabel(t).length > 0,
        toBe(true),
      ),
    ),
  ));

test("compact is smaller than grand", () =>
  check(
    sizingScale("sz-compact").basePx <
      sizingScale("sz-grand").basePx,
    toBe(true),
  ));

test("every layout has a label and a column count", () =>
  all(
    LAYOUTS.map((l: Layout) =>
      check(
        layoutLabel(l).length > 0 &&
          layoutColumns(l) >= 1,
        toBe(true),
      ),
    ),
  ));

const isSomeEq = (
  opt: ReturnType<typeof asLayout>,
): boolean =>
  pipe(
    opt,
    matchOption(
      (): boolean => false,
      (): boolean => true,
    ),
  );

test("asTagColor accepts a known color and rejects garbage", () =>
  all([
    check(
      pipe(
        asTagColor("success"),
        matchOption(
          (): boolean => false,
          (c: TagColor): boolean => c === "success",
        ),
      ),
      toBe(true),
    ),
    check(
      pipe(
        asTagColor("chartreuse"),
        matchOption(
          (): boolean => true,
          (): boolean => false,
        ),
      ),
      toBe(true),
    ),
  ]));

test("asSizingTheme accepts a known theme and rejects garbage", () =>
  all([
    check(
      pipe(
        asSizingTheme("sz-spacious"),
        matchOption(
          (): boolean => false,
          (t: SizingTheme): boolean =>
            t === "sz-spacious",
        ),
      ),
      toBe(true),
    ),
    check(
      pipe(
        asSizingTheme("huge"),
        matchOption(
          (): boolean => true,
          (): boolean => false,
        ),
      ),
      toBe(true),
    ),
  ]));

test("asLayout accepts a known layout and rejects garbage", () =>
  all([
    check(isSomeEq(asLayout("wide")), toBe(true)),
    check(
      isSomeEq(asLayout("diagonal")),
      toBe(false),
    ),
  ]));

test("the default config classifies the corpus's tree tags", () =>
  all([
    check(
      DEFAULT_CONFIG.tags.some(
        (t) => t.slug === "concepts",
      ),
      toBe(true),
    ),
    check(
      DEFAULT_CONFIG.exclusions.length,
      toBe(0),
    ),
    check(
      DEFAULT_CONFIG.layout,
      toBe("single-column"),
    ),
  ]));
