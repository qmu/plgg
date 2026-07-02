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

const validDev = {
  entry: "devEntry.ts",
  port: 5181,
  watch: ["src", "docs"],
  allowedHosts: ["plgg-guide.qmu.dev"],
};

test("asBundleConfig leaves dev absent for a build-only config", () =>
  check(
    asBundleConfig(valid).dev,
    toBe(undefined),
  ));

test("asBundleConfig accepts and narrows a dev section", () => {
  const c = asBundleConfig({
    ...valid,
    dev: validDev,
  });
  return all([
    check(c.dev?.entry, toBe("devEntry.ts")),
    check(c.dev?.port, toBe(5181)),
    check(c.dev?.watch.length, toBe(2)),
    check(
      c.dev?.allowedHosts[0],
      toBe("plgg-guide.qmu.dev"),
    ),
  ]);
});

test("asBundleConfig rejects a non-object dev section", () =>
  check(
    rejects({ ...valid, dev: 42 }),
    toBe(true),
  ));

test("asBundleConfig rejects a dev section with a bad port", () =>
  check(
    rejects({
      ...valid,
      dev: { ...validDev, port: "5181" },
    }),
    toBe(true),
  ));

test("asBundleConfig rejects a dev section with a non-string watch entry", () =>
  check(
    rejects({
      ...valid,
      dev: { ...validDev, watch: ["src", 7] },
    }),
    toBe(true),
  ));

test("asBundleConfig rejects a dev section with non-array allowedHosts", () =>
  check(
    rejects({
      ...valid,
      dev: {
        ...validDev,
        allowedHosts: "nope",
      },
    }),
    toBe(true),
  ));

test("asBundleConfig accepts target \"app\"", () =>
  check(
    asBundleConfig({ ...valid, target: "app" })
      .target,
    toBe("app"),
  ));

test("asBundleConfig rejects an invalid target", () =>
  check(
    rejects({ ...valid, target: "umd" }),
    toBe(true),
  ));

test("asBundleConfig rejects a non-string required field", () =>
  check(
    rejects({ ...valid, root: 7 }),
    toBe(true),
  ));

test("asBundleConfig rejects a malformed entry", () =>
  all([
    check(
      rejects({
        ...valid,
        entries: [{ name: "x" }],
      }),
      toBe(true),
    ),
    check(
      rejects({ ...valid, entries: [42] }),
      toBe(true),
    ),
  ]));

test("asBundleConfig rejects a malformed alias", () =>
  all([
    check(
      rejects({ ...valid, alias: { prefix: "p" } }),
      toBe(true),
    ),
    check(
      rejects({ ...valid, alias: "nope" }),
      toBe(true),
    ),
  ]));

test("asBundleConfig rejects a non-string format element", () =>
  check(
    rejects({ ...valid, formats: [7] }),
    toBe(true),
  ));
