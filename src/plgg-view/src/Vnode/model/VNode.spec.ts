import { test, expect } from "vitest";
import { isSome, isNone, getOr } from "plgg";
import {
  element,
  text,
  fragment,
  isVNode,
  normalizeChild,
  normalizeChildren,
  coercePropValue,
} from "plgg-view/index";

test("element/text/fragment build the tagged boxes", () => {
  const t = text("hi");
  expect(t.__tag).toBe("Text");
  expect(t.content.value).toBe("hi");

  const el = element("div", { id: "x" }, [t]);
  expect(el.__tag).toBe("Element");
  expect(el.content.tag).toBe("div");
  expect(el.content.props).toEqual({ id: "x" });
  expect(el.content.children).toEqual([t]);

  const f = fragment([t]);
  expect(f.__tag).toBe("Fragment");
  expect(f.content.children).toEqual([t]);
});

test("isVNode accepts the three node kinds and rejects others", () => {
  expect(isVNode(text("a"))).toBe(true);
  expect(isVNode(element("p", {}, []))).toBe(true);
  expect(isVNode(fragment([]))).toBe(true);
  expect(isVNode("a")).toBe(false);
  expect(isVNode(42)).toBe(false);
  expect(isVNode(null)).toBe(false);
  expect(isVNode({ __tag: "Other", content: 1 })).toBe(
    false,
  );
});

test("normalizeChild lifts primitives and drops nothings", () => {
  const node = element("b", {}, []);
  expect(normalizeChild(node)).toEqual([node]);
  expect(normalizeChild("txt")).toEqual([text("txt")]);
  expect(normalizeChild(7)).toEqual([text("7")]);
  // non-finite numbers, booleans, null/undefined, objects all drop
  expect(normalizeChild(NaN)).toEqual([]);
  expect(normalizeChild(true)).toEqual([]);
  expect(normalizeChild(false)).toEqual([]);
  expect(normalizeChild(null)).toEqual([]);
  expect(normalizeChild(undefined)).toEqual([]);
  expect(normalizeChild({ a: 1 })).toEqual([]);
});

test("normalizeChild flattens nested arrays", () => {
  expect(
    normalizeChild(["a", ["b", ["c"]], null]),
  ).toEqual([text("a"), text("b"), text("c")]);
});

test("normalizeChildren flattens a variadic child list", () => {
  const node = element("i", {}, []);
  expect(
    normalizeChildren(["a", false, node, [1, "b"]]),
  ).toEqual([
    text("a"),
    node,
    text("1"),
    text("b"),
  ]);
});

test("coercePropValue keeps strings, finite numbers, and true", () => {
  expect(getOr("")(coercePropValue("hello"))).toBe(
    "hello",
  );
  expect(getOr("")(coercePropValue(42))).toBe("42");
  expect(getOr("MISS")(coercePropValue(true))).toBe("");
  expect(isSome(coercePropValue("x"))).toBe(true);
});

test("coercePropValue drops false, non-finite, and non-primitives", () => {
  expect(isNone(coercePropValue(false))).toBe(true);
  expect(isNone(coercePropValue(Infinity))).toBe(true);
  expect(isNone(coercePropValue(NaN))).toBe(true);
  expect(isNone(coercePropValue(null))).toBe(true);
  expect(isNone(coercePropValue(undefined))).toBe(true);
  expect(isNone(coercePropValue(() => 1))).toBe(true);
  expect(isNone(coercePropValue({}))).toBe(true);
});
