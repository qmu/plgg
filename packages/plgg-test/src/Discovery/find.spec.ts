import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toHaveLength,
} from "../index.js";
import { discover } from "./find.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const srcRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("discovers spec files under a root", () => {
  const found = discover([srcRoot]);
  return all([
    check(found.length > 0, toBe(true)),
    check(
      found.every((f) => f.endsWith(".spec.ts")),
      toBe(true),
    ),
  ]);
});

test("returns absolute, sorted, deduped paths", () => {
  const found = discover([srcRoot, srcRoot]);
  const sorted = [...found].sort();
  return all([
    check(
      found,
      toEqual<readonly string[]>(sorted),
    ),
    check(
      new Set(found).size,
      toBe(found.length),
    ),
  ]);
});

test("missing root yields no specs (no throw)", () => {
  const found = discover([
    join(srcRoot, "does-not-exist"),
  ]);
  return check(found, toHaveLength(0));
});
