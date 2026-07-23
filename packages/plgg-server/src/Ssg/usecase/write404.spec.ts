import {
  test,
  check,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import {
  mkdtemp,
  writeFile,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { write404 } from "plgg-server/Ssg/usecase/writeStatic";

test("write404 emits 404.html", async () => {
  const out = await mkdtemp(
    join(tmpdir(), "ssg-404-"),
  );
  const result = await write404(out)(
    "<h1>Not Found</h1>",
  );
  const body = await readFile(
    join(out, "404.html"),
    "utf8",
  );
  await rm(out, {
    recursive: true,
    force: true,
  });
  return check(
    result,
    okThen(() =>
      check(
        body,
        toBe("<h1>Not Found</h1>"),
      ),
    ),
  );
});

test("write404 errs when outDir is unwritable", async () => {
  // A plain file standing where a directory is expected makes
  // `mkdir` reject (ENOTDIR), proving the fs error is lifted.
  const base = await mkdtemp(
    join(tmpdir(), "ssg-404-"),
  );
  const asFile = join(base, "file");
  await writeFile(asFile, "x", "utf8");
  const result = await write404(
    join(asFile, "nested"),
  )("<h1/>");
  await rm(base, {
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
