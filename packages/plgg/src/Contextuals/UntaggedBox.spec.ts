import { test, check, all, toBe } from "plgg-test";
import {
  untaggedBox,
  UNTAGGED_TAG,
} from "plgg/index";

test("untaggedBox wraps content with untagged tag", () => {
  const wrapped = untaggedBox(42);
  return all([
    check(wrapped.__tag, toBe(UNTAGGED_TAG)),
    check(wrapped.content, toBe(42)),
  ]);
});

test("untaggedBox tag is the shared constant", () =>
  check(UNTAGGED_TAG, toBe("__untagged__")));

test("untaggedBox wraps object content", () => {
  const data = { id: 1, name: "alice" };
  const wrapped = untaggedBox(data);
  return all([
    check(wrapped.content, toBe(data)),
    check(wrapped.__tag, toBe(UNTAGGED_TAG)),
  ]);
});

test("untaggedBox wraps null", () => {
  const wrapped = untaggedBox(null);
  return all([
    check(wrapped.content, toBe(null)),
    check(wrapped.__tag, toBe(UNTAGGED_TAG)),
  ]);
});
