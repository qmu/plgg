import {
  test,
  check,
  all,
  toBe,
  toHaveLength,
  okThen,
  errThen,
} from "plgg-test";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyAssets } from "plgg-server/Ssg/usecase/writeStatic";

test("copyAssets mirrors files into outDir", async () => {
  const src = await mkdtemp(
    join(tmpdir(), "ssg-src-"),
  );
  const out = await mkdtemp(
    join(tmpdir(), "ssg-out-"),
  );
  await writeFile(
    join(src, "robots.txt"),
    "ok",
    "utf8",
  );
  await mkdir(join(src, "img"), {
    recursive: true,
  });
  await writeFile(
    join(src, "img", "logo.svg"),
    "<svg/>",
    "utf8",
  );
  const result =
    await copyAssets(src)(out);
  const mirrored = await readFile(
    join(out, "img", "logo.svg"),
    "utf8",
  );
  await rm(src, {
    recursive: true,
    force: true,
  });
  await rm(out, {
    recursive: true,
    force: true,
  });
  return check(
    result,
    okThen((written) =>
      all([
        check(written, toHaveLength(2)),
        check(mirrored, toBe("<svg/>")),
      ]),
    ),
  );
});

test("copyAssets no-ops on a missing srcDir", async () => {
  const out = await mkdtemp(
    join(tmpdir(), "ssg-out-"),
  );
  const result = await copyAssets(
    join(tmpdir(), "ssg-no-src-xyz"),
  )(out);
  await rm(out, {
    recursive: true,
    force: true,
  });
  return check(
    result,
    okThen((written) =>
      check(written, toHaveLength(0)),
    ),
  );
});

test("copyAssets errs when srcDir is a file (non-ENOENT)", async () => {
  const out = await mkdtemp(
    join(tmpdir(), "ssg-out-"),
  );
  const file = join(out, "not-a-dir");
  await writeFile(file, "x", "utf8");
  // readdir on a plain file rejects with ENOTDIR — a non-ENOENT
  // fs error, so it must surface as a typed SsgError, not a no-op.
  const result = await copyAssets(file)(out);
  await rm(out, {
    recursive: true,
    force: true,
  });
  return check(
    result,
    errThen((e) =>
      check(e.__tag, toBe("WriteFailed")),
    ),
  );
});
