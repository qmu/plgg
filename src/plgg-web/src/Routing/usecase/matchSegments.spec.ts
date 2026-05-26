import { test, expect } from "vitest";
import { isSome, isNone } from "plgg";
import { compilePattern, matchSegments } from "plgg-web/index";

const match = (pattern: string, path: string) =>
  matchSegments(compilePattern(pattern), path);

test("static path matches exactly", () => {
  expect(isSome(match("/health", "/health"))).toBe(
    true,
  );
  expect(isNone(match("/health", "/nope"))).toBe(
    true,
  );
});

test("root pattern matches only root, capturing nothing", () => {
  const r = match("/", "/");
  expect(isSome(r)).toBe(true);
  if (isSome(r)) {
    expect(r.content).toEqual({});
  }
  expect(isNone(match("/", "/a"))).toBe(true);
});

test("param captures and decodes a single segment", () => {
  const r = match("/users/:id", "/users/42");
  if (isSome(r)) {
    expect(r.content).toEqual({ id: "42" });
  }
  const r2 = match("/u/:name", "/u/a%20b");
  if (isSome(r2)) {
    expect(r2.content).toEqual({ name: "a b" });
  }
});

test("too-few and too-many parts do not match", () => {
  expect(isNone(match("/users/:id", "/users"))).toBe(
    true,
  );
  expect(
    isNone(match("/users/:id", "/users/1/extra")),
  ).toBe(true);
});

test("wildcard captures the remainder, including empty", () => {
  const r = match("/files/*", "/files/a/b/c");
  if (isSome(r)) {
    expect(r.content).toEqual({ "*": "a/b/c" });
  }
  const empty = match("/files/*", "/files");
  if (isSome(empty)) {
    expect(empty.content).toEqual({ "*": "" });
  }
});

test("malformed percent-encoding falls back to the raw part", () => {
  const r = match("/x/:v", "/x/%E0%A4%A");
  if (isSome(r)) {
    expect(r.content).toEqual({ v: "%E0%A4%A" });
  }
});
