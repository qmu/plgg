import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  flex,
  flexCol,
  inlineFlex,
  block,
  grid,
  wrap,
  grow,
  listNone,
  items,
  justify,
  gap,
  p,
  pt,
  pr,
  pb,
  pl,
  px,
  py,
  m,
  mt,
  mr,
  mb,
  ml,
  mx,
  my,
  w,
  h,
  maxW,
  minW,
  wFull,
  hFull,
  text,
  weight,
  color,
  center,
  left,
  right,
  bg,
  rounded,
  border,
  borderColor,
  outline,
  shadow,
  opacity,
  pointer,
} from "plgg-view/Style/usecase/utilities";

test("spacing utilities use the 0.25rem scale", () =>
  all([
    check(p(3), toEqual([
      { prop: "padding", value: "0.75rem" },
    ])),
    check(gap(2), toEqual([
      { prop: "gap", value: "0.5rem" },
    ])),
    check(pt(1), toEqual([
      {
        prop: "padding-top",
        value: "0.25rem",
      },
    ])),
  ]));

test("axis shorthands emit both long-hands", () =>
  all([
    check(px(3), toEqual([
      { prop: "padding-left", value: "0.75rem" },
      { prop: "padding-right", value: "0.75rem" },
    ])),
    check(my(2), toEqual([
      { prop: "margin-top", value: "0.5rem" },
      { prop: "margin-bottom", value: "0.5rem" },
    ])),
  ]));

test("the whole single-prop spacing + sizing family", () =>
  all([
    check(pr(1)[0]?.prop, toBe("padding-right")),
    check(pb(1)[0]?.prop, toBe("padding-bottom")),
    check(pl(1)[0]?.prop, toBe("padding-left")),
    check(m(1)[0]?.prop, toBe("margin")),
    check(mt(1)[0]?.prop, toBe("margin-top")),
    check(mr(1)[0]?.prop, toBe("margin-right")),
    check(mb(1)[0]?.prop, toBe("margin-bottom")),
    check(ml(1)[0]?.prop, toBe("margin-left")),
    check(mx(1).length, toBe(2)),
    check(py(1).length, toBe(2)),
    check(w(4), toEqual([
      { prop: "width", value: "1rem" },
    ])),
    check(h(4)[0]?.prop, toBe("height")),
    check(maxW(10)[0]?.prop, toBe("max-width")),
    check(minW(2)[0]?.prop, toBe("min-width")),
  ]));

test("layout constants and helpers", () =>
  all([
    check(flex, toEqual([
      { prop: "display", value: "flex" },
    ])),
    check(flexCol, toEqual([
      { prop: "display", value: "flex" },
      {
        prop: "flex-direction",
        value: "column",
      },
    ])),
    check(
      inlineFlex[0]?.value,
      toBe("inline-flex"),
    ),
    check(block[0]?.value, toBe("block")),
    check(grid[0]?.value, toBe("grid")),
    check(wrap, toEqual([
      { prop: "flex-wrap", value: "wrap" },
    ])),
    check(grow, toEqual([
      { prop: "flex-grow", value: "1" },
    ])),
    check(listNone, toEqual([
      { prop: "list-style", value: "none" },
    ])),
    check(items("center"), toEqual([
      { prop: "align-items", value: "center" },
    ])),
    check(
      items("start")[0]?.value,
      toBe("flex-start"),
    ),
    check(justify("between"), toEqual([
      {
        prop: "justify-content",
        value: "space-between",
      },
    ])),
    check(
      justify("around")[0]?.value,
      toBe("space-around"),
    ),
    check(
      justify("end")[0]?.value,
      toBe("flex-end"),
    ),
  ]));

test("typography utilities", () =>
  all([
    check(text("lg"), toEqual([
      { prop: "font-size", value: "1.125rem" },
    ])),
    check(weight(600), toEqual([
      { prop: "font-weight", value: "600" },
    ])),
    check(color("text"), toEqual([
      { prop: "color", value: "#2a241d" },
    ])),
    check(center[0]?.value, toBe("center")),
    check(left[0]?.value, toBe("left")),
    check(right[0]?.value, toBe("right")),
  ]));

test("background and border utilities map tokens to values", () =>
  all([
    check(bg("primary"), toEqual([
      {
        prop: "background-color",
        value: "#1f6b54",
      },
    ])),
    check(rounded("md"), toEqual([
      { prop: "border-radius", value: "0.5rem" },
    ])),
    check(border, toEqual([
      {
        prop: "border",
        value: "1px solid #e6dcc8",
      },
    ])),
    check(
      borderColor("danger")[0]?.value,
      toBe("#b23a2a"),
    ),
    check(outline("primary"), toEqual([
      {
        prop: "outline",
        value: "2px solid #1f6b54",
      },
    ])),
  ]));

test("effect utilities", () =>
  all([
    check(shadow("sm")[0]?.prop, toBe("box-shadow")),
    check(opacity(0.5), toEqual([
      { prop: "opacity", value: "0.5" },
    ])),
    check(pointer, toEqual([
      { prop: "cursor", value: "pointer" },
    ])),
  ]));

test("wFull and hFull are 100%", () =>
  all([
    check(wFull, toEqual([
      { prop: "width", value: "100%" },
    ])),
    check(hFull, toEqual([
      { prop: "height", value: "100%" },
    ])),
  ]));
