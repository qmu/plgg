import { test, expect } from "vitest";
import { box, isSome, isNone, getOr } from "plgg";
import {
  isVNode,
  normalizeChild,
  normalizeChildren,
  coercePropValue,
} from "plgg-view/index";

const text = (value: string) => box("Text")({ value });
const el = box("Element");

test("isVNode accepts the three node kinds and rejects others", () => {
  expect(isVNode(text("a"))).toBe(true);
  expect(isVNode(el({ tag: "p", props: {}, children: [] }))).toBe(
    true,
  );
  expect(isVNode(box("Fragment")({ children: [] }))).toBe(true);
  expect(isVNode("a")).toBe(false);
  expect(isVNode(42)).toBe(false);
  expect(isVNode(null)).toBe(false);
  expect(isVNode({ __tag: "Other", content: 1 })).toBe(false);
});

test("normalizeChild lifts primitives and drops nothings", () => {
  const node = el({ tag: "b", props: {}, children: [] });
  expect(normalizeChild(node)).toEqual([node]);
  expect(normalizeChild("txt")).toEqual([text("txt")]);
  expect(normalizeChild(7)).toEqual([text("7")]);
  expect(normalizeChild(NaN)).toEqual([]);
  expect(normalizeChild(true)).toEqual([]);
  expect(normalizeChild(false)).toEqual([]);
  expect(normalizeChild(null)).toEqual([]);
  expect(normalizeChild(undefined)).toEqual([]);
  expect(normalizeChild({ a: 1 })).toEqual([]);
});

test("normalizeChild flattens nested arrays", () => {
  expect(normalizeChild(["a", ["b", ["c"]], null])).toEqual([
    text("a"),
    text("b"),
    text("c"),
  ]);
});

test("normalizeChildren flattens a variadic child list", () => {
  const node = el({ tag: "i", props: {}, children: [] });
  expect(
    normalizeChildren(["a", false, node, [1, "b"]]),
  ).toEqual([text("a"), node, text("1"), text("b")]);
});

test("coercePropValue keeps strings, finite numbers, and true", () => {
  expect(getOr("")(coercePropValue("hello"))).toBe("hello");
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
