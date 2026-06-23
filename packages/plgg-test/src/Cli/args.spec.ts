import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test/index";
import { parseArgs } from "plgg-test/Cli/args";

test("defaults roots to src", () => {
  const a = parseArgs([]);
  return all([
    check(a.roots, toEqual(["src"])),
    check(a.watch, toBe(false)),
    check(a.coverage, toBe(false)),
  ]);
});

test("parses roots and flags", () => {
  const a = parseArgs([
    "src",
    "lib",
    "--watch",
    "--coverage",
  ]);
  return all([
    check(
      a.roots,
      toEqual(["src", "lib"]),
    ),
    check(a.watch, toBe(true)),
    check(a.coverage, toBe(true)),
  ]);
});

test("flags only keeps default root", () => {
  const a = parseArgs(["--watch"]);
  return all([
    check(a.roots, toEqual(["src"])),
    check(a.watch, toBe(true)),
  ]);
});
