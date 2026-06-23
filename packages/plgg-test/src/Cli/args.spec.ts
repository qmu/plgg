import { test, expect } from "plgg-test/index";
import { parseArgs } from "plgg-test/Cli/args";

test("defaults roots to src", () => {
  const a = parseArgs([]);
  expect(a.roots).toEqual(["src"]);
  expect(a.watch).toBe(false);
  expect(a.coverage).toBe(false);
});

test("parses roots and flags", () => {
  const a = parseArgs([
    "src",
    "lib",
    "--watch",
    "--coverage",
  ]);
  expect(a.roots).toEqual(["src", "lib"]);
  expect(a.watch).toBe(true);
  expect(a.coverage).toBe(true);
});

test("flags only keeps default root", () => {
  const a = parseArgs(["--watch"]);
  expect(a.roots).toEqual(["src"]);
  expect(a.watch).toBe(true);
});
