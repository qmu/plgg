import { test, check, toEqual } from "plgg-test";
import {
  staticSegment,
  paramSegment,
  wildcardSegment,
} from "plgg-router/Routing/model/Segment";

test("staticSegment tags a literal", () =>
  check(
    staticSegment("users"),
    toEqual({
      __tag: "Static",
      content: "users",
    }),
  ));

test("paramSegment tags a named parameter", () =>
  check(
    paramSegment("id"),
    toEqual({
      __tag: "Param",
      content: "id",
    }),
  ));

test("wildcardSegment tags a remainder capture", () =>
  check(
    wildcardSegment("*"),
    toEqual({
      __tag: "Wildcard",
      content: "*",
    }),
  ));
