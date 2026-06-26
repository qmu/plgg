import {
  test,
  check,
  all,
  toBe,
  toHaveLength,
  shouldBeOk,
  errThen,
} from "plgg-test";
import {
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isOk } from "plgg";
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
  if (!isOk(result)) {
    await rm(out, {
      recursive: true,
      force: true,
    });
    return check(result, shouldBeOk());
  }
  const a1 = check(
    result.content,
    toHaveLength(2),
  );
  const root = await readFile(
    join(out, "index.html"),
    "utf8",
  );
  const about = await readFile(
    join(out, "about", "index.html"),
    "utf8",
  );
  await rm(out, { recursive: true, force: true });
  return all([
    a1,
    check(root, toBe("<i>root</i>")),
    check(about, toBe("<i>about</i>")),
  ]);
});

test("writeStatic rejects a path escaping outDir", async () => {
  const out = await mkdtemp(
    join(tmpdir(), "ssg-"),
  );
  const result = await writeStatic(out)([
    ssgPage("/../evil", "x"),
  ]);
  const verdict = check(
    result,
    errThen((e) =>
      check(e.__tag, toBe("WriteFailed")),
    ),
  );
  await rm(out, { recursive: true, force: true });
  return verdict;
});
