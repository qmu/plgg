import {
  test,
  expect,
  assert,
} from "plgg-test/index";
import { readConfig } from "plgg-test/Coverage/config";
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

test("reads threshold and exclude from config", () => {
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
    assert(isSome(c.threshold));
    expect(c.threshold.content).toBe(91);
    expect(c.exclude).toEqual(["/Foo/"]);
  });
});

test("missing config => ungated with default excludes", () => {
  withDir((dir) => {
    const c = readConfig(dir);
    expect(isNone(c.threshold)).toBe(true);
    expect(c.exclude.length > 0).toBe(true);
  });
});

test("config without threshold => ungated", () => {
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
    expect(isNone(c.threshold)).toBe(true);
    expect(c.exclude).toEqual(["/Bar/"]);
  });
});
