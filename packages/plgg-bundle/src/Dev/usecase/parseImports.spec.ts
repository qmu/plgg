import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { parseImports } from "plgg-bundle/Dev/usecase/parseImports";

test("parseImports reads static import + re-export + dynamic forms", () =>
  check(
    parseImports(
      [
        `import { a } from "./a.ts";`,
        `import b from './b';`,
        `export { c } from "./c.ts";`,
        `const d = await import("./d.ts");`,
        `export * from "./e";`,
      ].join("\n"),
    ),
    toEqual([
      // `from "…"` matches (import/export/re-export) come
      // first, then the dynamic `import("…")` pass.
      "./a.ts",
      "./b",
      "./c.ts",
      "./e",
      "./d.ts",
    ]),
  ));

test("parseImports returns empty for a source with no imports", () =>
  check(
    parseImports(
      "export const x = 1;\n",
    ).length,
    toBe(0),
  ));

test("parseImports captures bare package + node specifiers too (adapter filters locality)", () =>
  check(
    parseImports(
      `import { x } from "node:fs";\nimport y from "some-pkg";`,
    ),
    toEqual(["node:fs", "some-pkg"]),
  ));

test("parseImports handles single and double quotes", () =>
  all([
    check(
      parseImports(`import("./x.ts")`),
      toEqual(["./x.ts"]),
    ),
    check(
      parseImports(`import('./y.ts')`),
      toEqual(["./y.ts"]),
    ),
  ]));
