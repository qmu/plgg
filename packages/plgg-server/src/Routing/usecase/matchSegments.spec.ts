import {
  test,
  check,
  all,
  toEqual,
  someThen,
  shouldBeSome,
  shouldBeNone,
} from "plgg-test";
import {
  compilePattern,
  matchSegments,
} from "plgg-server/index";

const match = (pattern: string, path: string) =>
  matchSegments(compilePattern(pattern), path);

test("static path matches exactly", () =>
  all([
    check(
      match("/health", "/health"),
      shouldBeSome(),
    ),
    check(
      match("/health", "/nope"),
      shouldBeNone(),
    ),
  ]));

test("root pattern matches only root, capturing nothing", () =>
  all([
    check(
      match("/", "/"),
      someThen((c) => check(c, toEqual({}))),
    ),
    check(match("/", "/a"), shouldBeNone()),
  ]));

test("param captures and decodes a single segment", () =>
  all([
    check(
      match("/users/:id", "/users/42"),
      someThen((c) =>
        check(c, toEqual({ id: "42" })),
      ),
    ),
    check(
      match("/u/:name", "/u/a%20b"),
      someThen((c) =>
        check(c, toEqual({ name: "a b" })),
      ),
    ),
  ]));

test("too-few and too-many parts do not match", () =>
  all([
    check(
      match("/users/:id", "/users"),
      shouldBeNone(),
    ),
    check(
      match("/users/:id", "/users/1/extra"),
      shouldBeNone(),
    ),
  ]));

test("wildcard captures the remainder, including empty", () =>
  all([
    check(
      match("/files/*", "/files/a/b/c"),
      someThen((c) =>
        check(c, toEqual({ "*": "a/b/c" })),
      ),
    ),
    check(
      match("/files/*", "/files"),
      someThen((c) =>
        check(c, toEqual({ "*": "" })),
      ),
    ),
  ]));

test("malformed percent-encoding falls back to the raw part", () =>
  check(
    match("/x/:v", "/x/%E0%A4%A"),
    someThen((c) =>
      check(c, toEqual({ v: "%E0%A4%A" })),
    ),
  ));
