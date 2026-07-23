import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "../index.js";
import {
  readConfig,
  DEFAULT_THRESHOLD,
} from "./config.js";
import { isOk, isErr } from "plgg";
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

const write = (
  dir: string,
  body: string,
): void =>
  writeFileSync(
    join(dir, "plgg-test.config.json"),
    body,
  );

const thresholdOf = (
  dir: string,
): number | undefined => {
  const c = readConfig(dir);
  return isOk(c) &&
    c.content.gate.kind === "gated"
    ? c.content.gate.threshold
    : undefined;
};

const reasonOf = (
  dir: string,
): string | undefined => {
  const c = readConfig(dir);
  return isOk(c) &&
    c.content.gate.kind === "exempt"
    ? c.content.gate.reason
    : undefined;
};

const excludeOf = (
  dir: string,
): readonly string[] => {
  const c = readConfig(dir);
  return isOk(c) ? c.content.exclude : [];
};

test("gated config: reads threshold and exclude", () =>
  withDir((dir) => {
    write(
      dir,
      JSON.stringify({
        coverage: {
          threshold: 91,
          exclude: ["/Foo/"],
        },
      }),
    );
    return all([
      check(
        thresholdOf(dir),
        toBe<number | undefined>(91),
      ),
      check(
        excludeOf(dir),
        toEqual<readonly string[]>(["/Foo/"]),
      ),
    ]);
  }));

test("missing config => gated at default with default excludes", () =>
  withDir((dir) =>
    all([
      check(
        thresholdOf(dir),
        toBe<number | undefined>(
          DEFAULT_THRESHOLD,
        ),
      ),
      check(
        excludeOf(dir).length > 0,
        toBe(true),
      ),
    ]),
  ));

test("config without threshold => gated at default (no longer ungated)", () =>
  withDir((dir) => {
    write(
      dir,
      JSON.stringify({
        coverage: { exclude: ["/Bar/"] },
      }),
    );
    return all([
      check(
        thresholdOf(dir),
        toBe<number | undefined>(
          DEFAULT_THRESHOLD,
        ),
      ),
      check(
        excludeOf(dir),
        toEqual<readonly string[]>(["/Bar/"]),
      ),
    ]);
  }));

test("exempt with reason => exempt gate", () =>
  withDir((dir) => {
    write(
      dir,
      JSON.stringify({
        coverage: {
          exempt: "private demo app",
        },
      }),
    );
    return check(
      reasonOf(dir),
      toBe<string | undefined>(
        "private demo app",
      ),
    );
  }));

test("empty-string exempt => Err (never a silent skip)", () =>
  withDir((dir) => {
    write(
      dir,
      JSON.stringify({
        coverage: { exempt: "" },
      }),
    );
    return check(
      isErr(readConfig(dir)),
      toBe(true),
    );
  }));

test("non-string exempt => Err", () =>
  withDir((dir) => {
    write(
      dir,
      JSON.stringify({
        coverage: { exempt: 5 },
      }),
    );
    return check(
      isErr(readConfig(dir)),
      toBe(true),
    );
  }));

test("malformed JSON => Err", () =>
  withDir((dir) => {
    write(dir, "{ not: valid json");
    return check(
      isErr(readConfig(dir)),
      toBe(true),
    );
  }));
