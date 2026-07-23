import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  readFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";

/**
 * The re-extraction pin (ticket 20260716000445): a
 * protocol substrate that reaches a SQLite store is
 * not a substrate. This spec is the module-graph
 * restatement of the original bun gate (bun is not
 * installed on this host): nothing content-shaped —
 * `node:sqlite`, `plgg-sql`, `plgg-cms`,
 * `plgg-content` — may appear anywhere in this
 * package's source, and its runtime dependency set is
 * exactly `plgg`. The first convenience re-export
 * that drags the store back in turns this red.
 */
const FORBIDDEN: ReadonlyArray<string> = [
  "node:sqlite",
  "plgg-sql",
  "plgg-cms",
  "plgg-content",
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

test("no content-store module is reachable from plgg-mcp source", () =>
  all(
    sourceFiles(srcRoot).map((file) =>
      pipeCheck(file, readFileSync(file, "utf8")),
    ),
  ));

/**
 * One file's forbidden-specifier check, named so a
 * failure points at the offending file.
 */
const pipeCheck = (
  file: string,
  content: string,
) =>
  check(
    FORBIDDEN.filter((specifier) =>
      content.includes(specifier),
    ).map((specifier) => `${file}: ${specifier}`),
    toEqual([]),
  );

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

test("the barrel exports the four protocol slices and nothing content-shaped", () =>
  check(
    readFileSync(
      join(srcRoot, "index.ts"),
      "utf8",
    ).includes("Tools"),
    toBe(false),
  ));
