import {
  test,
  check,
  all,
  toEqual,
} from "plgg-test";
import {
  readFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";

/**
 * The integration-1 pin (ticket 20260716164916):
 * this core must stay browser-shippable — the same
 * code runs in the SSG build step and in the
 * reader's page. No node builtin and nothing
 * server-shaped may appear anywhere in the
 * package's production source, and the runtime
 * dependency set stays exactly `plgg`.
 */
const FORBIDDEN: ReadonlyArray<string> = [
  "node:",
  "plgg-sql",
  "plgg-cms",
  "plgg-server",
];

const sourceFiles = (
  dir: string,
): ReadonlyArray<string> =>
  readdirSync(dir, {
    withFileTypes: true,
  }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFiles(join(dir, entry.name))
      : entry.name.endsWith(".ts") &&
          !entry.name.endsWith(".spec.ts")
        ? [join(dir, entry.name)]
        : [],
  );

// plgg-test runs from the package root, so paths
// resolve against it.
const srcRoot = join(process.cwd(), "src");

test("no node builtin or server module is reachable from plgg-search source", () =>
  all(
    sourceFiles(srcRoot).map((file) =>
      check(
        FORBIDDEN.filter((specifier) =>
          readFileSync(file, "utf8").includes(
            specifier,
          ),
        ).map(
          (specifier) => `${file}: ${specifier}`,
        ),
        toEqual([]),
      ),
    ),
  ));

test("the runtime dependency set is exactly plgg", () => {
  const manifest: unknown = JSON.parse(
    readFileSync(
      join(process.cwd(), "package.json"),
      "utf8",
    ),
  );
  return check(
    manifest !== null &&
      typeof manifest === "object" &&
      "dependencies" in manifest
      ? Object.keys(Object(manifest.dependencies))
      : [],
    toEqual(["plgg"]),
  );
});
