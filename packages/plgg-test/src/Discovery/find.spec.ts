import { test, expect } from "plgg-test/index";
import { discover } from "plgg-test/Discovery/find";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const srcRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("discovers spec files under a root", () => {
  const found = discover([srcRoot]);
  expect(found.length > 0).toBe(true);
  expect(
    found.every((f) => f.endsWith(".spec.ts")),
  ).toBe(true);
});

test("returns absolute, sorted, deduped paths", () => {
  const found = discover([srcRoot, srcRoot]);
  const sorted = [...found].sort();
  expect(found).toEqual(sorted);
  expect(new Set(found).size).toBe(found.length);
});

test("missing root yields no specs (no throw)", () => {
  const found = discover([
    join(srcRoot, "does-not-exist"),
  ]);
  expect(found).toEqual([]);
});
