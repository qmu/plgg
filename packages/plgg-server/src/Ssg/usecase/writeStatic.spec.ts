import { test, expect, assert } from "vitest";
import {
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isOk, isErr } from "plgg";
import { ssgPage } from "plgg-server/Ssg/model/Ssg";
import { writeStatic } from "plgg-server/Ssg/usecase/writeStatic";

test("writeStatic writes directory-index files", async () => {
  const out = await mkdtemp(
    join(tmpdir(), "ssg-"),
  );
  const result = await writeStatic(out)([
    ssgPage("/", "<i>root</i>"),
    ssgPage("/about", "<i>about</i>"),
  ]);
  assert(isOk(result));
  expect(result.content).toHaveLength(2);
  expect(
    await readFile(
      join(out, "index.html"),
      "utf8",
    ),
  ).toBe("<i>root</i>");
  expect(
    await readFile(
      join(out, "about", "index.html"),
      "utf8",
    ),
  ).toBe("<i>about</i>");
  await rm(out, {
    recursive: true,
    force: true,
  });
});

test("writeStatic rejects a path escaping outDir", async () => {
  const out = await mkdtemp(
    join(tmpdir(), "ssg-"),
  );
  const result = await writeStatic(out)([
    ssgPage("/../evil", "x"),
  ]);
  assert(isErr(result));
  expect(result.content.__tag).toBe(
    "WriteFailed",
  );
  await rm(out, {
    recursive: true,
    force: true,
  });
});
