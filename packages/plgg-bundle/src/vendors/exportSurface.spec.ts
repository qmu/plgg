import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveExportNames } from "plgg-bundle/vendors/exportSurface";

/**
 * A fixture package whose barrel exercises every case the
 * derivation must handle: a direct value export, a
 * function, a re-export through the self-alias
 * (`export * from "fixture/leaf"`), a `default` export,
 * and type-only exports both direct and re-exported —
 * which must NOT appear in the runtime named-export list.
 */
const makeFixture = (): string => {
  const root = mkdtempSync(
    join(tmpdir(), "plgg-bundle-exports-"),
  );
  mkdirSync(join(root, "src"), {
    recursive: true,
  });
  writeFileSync(
    join(root, "src", "leaf.ts"),
    [
      "export const leafVal = 1;",
      "export type LeafType = string;",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(root, "src", "index.ts"),
    [
      'export * from "fixture/leaf";',
      "export const direct = 2;",
      "export function fn() {",
      "  return 0;",
      "}",
      "export type DirectType = number;",
      "export default { direct };",
      "",
    ].join("\n"),
  );
  return root;
};

test("deriveExportNames returns only runtime value exports, transitively, sorted", () => {
  const root = makeFixture();
  try {
    const names = deriveExportNames({
      entryFile: join(root, "src", "index.ts"),
      root,
      aliasPrefix: "fixture",
      aliasSrcRoot: "src",
    });
    return all([
      // The re-exported value (via the alias), the
      // direct const, and the function — sorted. No
      // type-only exports (LeafType, DirectType) and no
      // `default`.
      check(
        names.join(","),
        toBe("direct,fn,leafVal"),
      ),
    ]);
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

test("deriveExportNames on a value-free (type-only) module is empty", () => {
  const root = mkdtempSync(
    join(tmpdir(), "plgg-bundle-exports-types-"),
  );
  try {
    mkdirSync(join(root, "src"), {
      recursive: true,
    });
    writeFileSync(
      join(root, "src", "index.ts"),
      [
        "export type Only = string;",
        "export interface Shape {",
        "  x: number;",
        "}",
        "",
      ].join("\n"),
    );
    const names = deriveExportNames({
      entryFile: join(root, "src", "index.ts"),
      root,
      aliasPrefix: "fixture",
      aliasSrcRoot: "src",
    });
    return check(names.length, toBe(0));
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});
