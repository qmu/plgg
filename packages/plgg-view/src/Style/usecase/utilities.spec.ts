import { test, expect } from "vitest";
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

test("spacing utilities use the 0.25rem scale", () => {
  expect(p(3)).toEqual([
    { prop: "padding", value: "0.75rem" },
  ]);
  expect(gap(2)).toEqual([
    { prop: "gap", value: "0.5rem" },
  ]);
  expect(pt(1)).toEqual([
    { prop: "padding-top", value: "0.25rem" },
  ]);
});

test("axis shorthands emit both long-hands", () => {
  expect(px(3)).toEqual([
    { prop: "padding-left", value: "0.75rem" },
    { prop: "padding-right", value: "0.75rem" },
  ]);
  expect(my(2)).toEqual([
    { prop: "margin-top", value: "0.5rem" },
    { prop: "margin-bottom", value: "0.5rem" },
  ]);
});

test("the whole single-prop spacing + sizing family", () => {
  expect(pr(1)[0]?.prop).toBe("padding-right");
  expect(pb(1)[0]?.prop).toBe("padding-bottom");
  expect(pl(1)[0]?.prop).toBe("padding-left");
  expect(m(1)[0]?.prop).toBe("margin");
  expect(mt(1)[0]?.prop).toBe("margin-top");
  expect(mr(1)[0]?.prop).toBe("margin-right");
  expect(mb(1)[0]?.prop).toBe("margin-bottom");
  expect(ml(1)[0]?.prop).toBe("margin-left");
  expect(mx(1).length).toBe(2);
  expect(py(1).length).toBe(2);
  expect(w(4)).toEqual([
    { prop: "width", value: "1rem" },
  ]);
  expect(h(4)[0]?.prop).toBe("height");
  expect(maxW(10)[0]?.prop).toBe("max-width");
  expect(minW(2)[0]?.prop).toBe("min-width");
});

test("layout constants and helpers", () => {
  expect(flex).toEqual([
    { prop: "display", value: "flex" },
  ]);
  expect(flexCol).toEqual([
    { prop: "display", value: "flex" },
    { prop: "flex-direction", value: "column" },
  ]);
  expect(inlineFlex[0]?.value).toBe(
    "inline-flex",
  );
  expect(block[0]?.value).toBe("block");
  expect(grid[0]?.value).toBe("grid");
  expect(wrap).toEqual([
    { prop: "flex-wrap", value: "wrap" },
  ]);
  expect(grow).toEqual([
    { prop: "flex-grow", value: "1" },
  ]);
  expect(listNone).toEqual([
    { prop: "list-style", value: "none" },
  ]);
  expect(items("center")).toEqual([
    { prop: "align-items", value: "center" },
  ]);
  expect(items("start")[0]?.value).toBe(
    "flex-start",
  );
  expect(justify("between")).toEqual([
    {
      prop: "justify-content",
      value: "space-between",
    },
  ]);
  expect(justify("around")[0]?.value).toBe(
    "space-around",
  );
  expect(justify("end")[0]?.value).toBe(
    "flex-end",
  );
});

test("typography utilities", () => {
  expect(text("lg")).toEqual([
    { prop: "font-size", value: "1.125rem" },
  ]);
  expect(weight(600)).toEqual([
    { prop: "font-weight", value: "600" },
  ]);
  expect(color("text")).toEqual([
    { prop: "color", value: "#2a241d" },
  ]);
  expect(center[0]?.value).toBe("center");
  expect(left[0]?.value).toBe("left");
  expect(right[0]?.value).toBe("right");
});

test("background and border utilities map tokens to values", () => {
  expect(bg("primary")).toEqual([
    {
      prop: "background-color",
      value: "#1f6b54",
    },
  ]);
  expect(rounded("md")).toEqual([
    { prop: "border-radius", value: "0.5rem" },
  ]);
  expect(border).toEqual([
    {
      prop: "border",
      value: "1px solid #e6dcc8",
    },
  ]);
  expect(borderColor("danger")[0]?.value).toBe(
    "#b23a2a",
  );
  expect(outline("primary")).toEqual([
    {
      prop: "outline",
      value: "2px solid #1f6b54",
    },
  ]);
});

test("effect utilities", () => {
  expect(shadow("sm")[0]?.prop).toBe(
    "box-shadow",
  );
  expect(opacity(0.5)).toEqual([
    { prop: "opacity", value: "0.5" },
  ]);
  expect(pointer).toEqual([
    { prop: "cursor", value: "pointer" },
  ]);
});

test("wFull and hFull are 100%", () => {
  expect(wFull).toEqual([
    { prop: "width", value: "100%" },
  ]);
  expect(hFull).toEqual([
    { prop: "height", value: "100%" },
  ]);
});
