import {
  test,
  check,
  all,
  toEqual,
} from "plgg-test";
import {
  compilePattern,
  splitPath,
} from "plgg-server/index";

test("splitPath drops empty segments from slashes", () =>
  all([
    check(
      splitPath("/a/b/"),
      toEqual(["a", "b"]),
    ),
    check(
      splitPath("//a//b"),
      toEqual(["a", "b"]),
    ),
    check(splitPath("/"), toEqual([])),
    check(splitPath(""), toEqual([])),
  ]));

test("compilePattern produces tagged Box segments", () =>
  check(
    compilePattern("/users/:id/posts/*"),
    toEqual([
      { __tag: "Static", content: "users" },
      { __tag: "Param", content: "id" },
      { __tag: "Static", content: "posts" },
      { __tag: "Wildcard", content: "*" },
    ]),
  ));

test("compilePattern supports a named wildcard", () =>
  check(
    compilePattern("/files/*path"),
    toEqual([
      { __tag: "Static", content: "files" },
      { __tag: "Wildcard", content: "path" },
    ]),
  ));

test("compilePattern of root is empty", () =>
  check(compilePattern("/"), toEqual([])));
