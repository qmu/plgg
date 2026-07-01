import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { join } from "node:path";
import { rewriteDtsContent } from "plgg-bundle/domain/usecase/rewriteDtsAliases";

const distDir = "/pkg/dist";
// A declaration two levels deep, so a rewrite to a
// top-level sibling is a `../../` path.
const file = join(
  distDir,
  "Disjunctives",
  "Result.d.ts",
);

test("rewriteDtsContent relativizes an alias in `from` position", () =>
  check(
    rewriteDtsContent(
      file,
      `import { Ok } from "plgg/index";`,
      distDir,
      "plgg",
    ),
    toBe(`import { Ok } from "../index";`),
  ));

test("rewriteDtsContent relativizes a re-export and an inline import()", () =>
  all([
    check(
      rewriteDtsContent(
        join(distDir, "index.d.ts"),
        `export * from "plgg/Atomics";`,
        distDir,
        "plgg",
      ),
      toBe(`export * from "./Atomics";`),
    ),
    check(
      rewriteDtsContent(
        join(distDir, "index.d.ts"),
        `export type T = import("plgg/Atomics/Num").Num;`,
        distDir,
        "plgg",
      ),
      toBe(
        `export type T = import("./Atomics/Num").Num;`,
      ),
    ),
  ]));

test("rewriteDtsContent leaves a literal-type string untouched (gap #7)", () =>
  // A string-literal type that merely looks like an
  // alias must NOT be rewritten — it is not an
  // import/export specifier position.
  check(
    rewriteDtsContent(
      join(distDir, "index.d.ts"),
      `export type Tag = "plgg/not-a-module";`,
      distDir,
      "plgg",
    ),
    toBe(
      `export type Tag = "plgg/not-a-module";`,
    ),
  ));
