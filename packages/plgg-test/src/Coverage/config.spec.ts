import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "../index.js";
import { readConfig } from "./config.js";
import { isSome, isNone } from "plgg";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const withDir = <T>(
  fn: (dir: string) => T,
): T => {
  const dir = mkdtempSync(
    join(tmpdir(), "plgg-cfg-"),
  );
  try {
    return fn(dir);
  } finally {
    rmSync(dir, {
      recursive: true,
      force: true,
    });
  }
};

test("reads threshold and exclude from config", () =>
  withDir((dir) => {
    writeFileSync(
      join(dir, "plgg-test.config.json"),
      JSON.stringify({
        coverage: {
          threshold: 91,
          exclude: ["/Foo/"],
        },
      }),
    );
    const c = readConfig(dir);
    return all([
      check(isSome(c.threshold), toBe(true)),
      check(
        isSome(c.threshold)
          ? c.threshold.content
          : undefined,
        toBe<number | undefined>(91),
      ),
      check(
        c.exclude,
        toEqual<readonly string[]>(["/Foo/"]),
      ),
    ]);
  }));

test("missing config => ungated with default excludes", () =>
  withDir((dir) => {
    const c = readConfig(dir);
    return all([
      check(isNone(c.threshold), toBe(true)),
      check(c.exclude.length > 0, toBe(true)),
    ]);
  }));

test("config without threshold => ungated", () =>
  withDir((dir) => {
    writeFileSync(
      join(dir, "plgg-test.config.json"),
      JSON.stringify({
        coverage: {
          exclude: ["/Bar/"],
        },
      }),
    );
    const c = readConfig(dir);
    return all([
      check(isNone(c.threshold), toBe(true)),
      check(
        c.exclude,
        toEqual<readonly string[]>(["/Bar/"]),
      ),
    ]);
  }));
