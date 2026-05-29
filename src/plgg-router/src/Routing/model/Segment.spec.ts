import { test, expect } from "vitest";
import {
  staticSegment,
  paramSegment,
  wildcardSegment,
} from "plgg-router/Routing/model/Segment";

test("staticSegment tags a literal", () => {
  expect(staticSegment("users")).toEqual({
    __tag: "Static",
    content: "users",
  });
});

test("paramSegment tags a named parameter", () => {
  expect(paramSegment("id")).toEqual({
    __tag: "Param",
    content: "id",
  });
});

test("wildcardSegment tags a remainder capture", () => {
  expect(wildcardSegment("*")).toEqual({
    __tag: "Wildcard",
    content: "*",
  });
});
