import { test, expect } from "vitest";
import {
  untaggedBox,
  UNTAGGED_TAG,
} from "plgg/index";

test("untaggedBox wraps content with untagged tag", () => {
  const wrapped = untaggedBox(42);
  expect(wrapped.__tag).toBe(UNTAGGED_TAG);
  expect(wrapped.content).toBe(42);
});

test("untaggedBox tag is the shared constant", () => {
  expect(UNTAGGED_TAG).toBe("__untagged__");
});

test("untaggedBox wraps object content", () => {
  const data = { id: 1, name: "alice" };
  const wrapped = untaggedBox(data);
  expect(wrapped.content).toBe(data);
  expect(wrapped.__tag).toBe(UNTAGGED_TAG);
});

test("untaggedBox wraps null", () => {
  const wrapped = untaggedBox(null);
  expect(wrapped.content).toBe(null);
  expect(wrapped.__tag).toBe(UNTAGGED_TAG);
});
