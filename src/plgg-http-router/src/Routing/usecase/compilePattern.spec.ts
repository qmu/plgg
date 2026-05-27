import { test, expect } from "vitest";
import { compilePattern, splitPath } from "plgg-http-router/index";

test("splitPath drops empty segments from slashes", () => {
  expect(splitPath("/a/b/")).toEqual(["a", "b"]);
  expect(splitPath("//a//b")).toEqual(["a", "b"]);
  expect(splitPath("/")).toEqual([]);
  expect(splitPath("")).toEqual([]);
});

test("compilePattern produces tagged Box segments", () => {
  expect(
    compilePattern("/users/:id/posts/*"),
  ).toEqual([
    { __tag: "Static", content: "users" },
    { __tag: "Param", content: "id" },
    { __tag: "Static", content: "posts" },
    { __tag: "Wildcard", content: "*" },
  ]);
});

test("compilePattern supports a named wildcard", () => {
  expect(compilePattern("/files/*path")).toEqual([
    { __tag: "Static", content: "files" },
    { __tag: "Wildcard", content: "path" },
  ]);
});

test("compilePattern of root is empty", () => {
  expect(compilePattern("/")).toEqual([]);
});
