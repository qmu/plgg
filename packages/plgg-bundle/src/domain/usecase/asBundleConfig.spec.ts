import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { asBundleConfig } from "plgg-bundle/domain/usecase/asBundleConfig";

const valid = {
  root: "/pkg",
  rootDir: "src",
  outDir: "dist",
  fileNamePattern: "[name].[format].js",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  alias: { prefix: "plgg", srcRoot: "src" },
};

/**
 * True when `asBundleConfig(input)` throws a ConfigError
 * (plain-TS validators throw rather than return a
 * `Result`, so the spec catches at the boundary).
 */
const rejects = (input: unknown): boolean => {
  try {
    asBundleConfig(input);
    return false;
  } catch (e) {
    return (
      e instanceof Error &&
      e.message.startsWith("ConfigError")
    );
  }
};

test("asBundleConfig accepts a well-formed config", () => {
  const c = asBundleConfig(valid);
  return all([
    check(c.root, toBe("/pkg")),
    check(
      c.fileNamePattern,
      toBe("[name].[format].js"),
    ),
    check(c.formats.length, toBe(2)),
    check(c.entries.length, toBe(1)),
    check(c.alias.prefix, toBe("plgg")),
  ]);
});

test("asBundleConfig rejects a non-object", () =>
  check(rejects(42), toBe(true)));

test("asBundleConfig rejects a missing field", () =>
  check(
    rejects({ ...valid, formats: undefined }),
    toBe(true),
  ));

test("asBundleConfig rejects an invalid format", () =>
  check(
    rejects({ ...valid, formats: ["es", "umd"] }),
    toBe(true),
  ));
