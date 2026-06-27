import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  joinPath,
  listDir,
  readFileText,
  writeFileText,
} from "plgg-db-migration/vendors/fs";

const tmp = mkdtempSync(
  joinPath(tmpdir(), "plgg-dbm-fs-"),
);

test("writeFileText then readFileText round-trips, and listDir sees the file", async () => {
  const path = joinPath(tmp, "note.txt");
  return all([
    check(
      await writeFileText(path, "hello"),
      okThen((p) => toBe(path)(p)),
    ),
    check(
      await readFileText(path),
      okThen((t) => toBe("hello")(t)),
    ),
    check(
      await listDir(tmp),
      okThen((entries) =>
        toBe(true)(entries.includes("note.txt")),
      ),
    ),
  ]);
});

test("writeFileText creates parent directories", async () => {
  const nested = joinPath(
    joinPath(tmp, "deep"),
    "child.txt",
  );
  return all([
    check(
      await writeFileText(nested, "x"),
      okThen((p) => toBe(nested)(p)),
    ),
    check(
      await readFileText(nested),
      okThen((t) => toBe("x")(t)),
    ),
  ]);
});

test("readFileText on a missing file is an IoFailure", async () =>
  check(
    await readFileText(
      joinPath(tmp, "absent.txt"),
    ),
    errThen((e) =>
      check(e.content.kind, toBe("IoFailure")),
    ),
  ));

test("listDir on a missing directory is an IoFailure", async () =>
  check(
    await listDir(joinPath(tmp, "no-such-dir")),
    errThen((e) =>
      check(e.content.kind, toBe("IoFailure")),
    ),
  ));
