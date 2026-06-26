import {
  test,
  check,
  all,
  toEqual,
  someThen,
  shouldBeSome,
  shouldBeNone,
} from "plgg-test";
import { compilePattern } from "plgg-router/Routing/usecase/compilePattern";
import { matchSegments } from "plgg-router/Routing/usecase/matchSegments";

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
      someThen((caps) => toEqual({})(caps)),
    ),
    check(match("/", "/a"), shouldBeNone()),
  ]));

test("param captures and decodes a single segment", () =>
  all([
    check(
      match("/users/:id", "/users/42"),
      someThen((caps) =>
        toEqual({ id: "42" })(caps),
      ),
    ),
    check(
      match("/u/:name", "/u/a%20b"),
      someThen((caps) =>
        toEqual({ name: "a b" })(caps),
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
      someThen((caps) =>
        toEqual({ "*": "a/b/c" })(caps),
      ),
    ),
    check(
      match("/files/*", "/files"),
      someThen((caps) =>
        toEqual({ "*": "" })(caps),
      ),
    ),
  ]));

test("malformed percent-encoding falls back to the raw part", () =>
  check(
    match("/x/:v", "/x/%E0%A4%A"),
    someThen((caps) =>
      toEqual({ v: "%E0%A4%A" })(caps),
    ),
  ));
