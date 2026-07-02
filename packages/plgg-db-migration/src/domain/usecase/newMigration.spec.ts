import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { isOk } from "plgg";
import {
  mkdtempSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  newMigration,
  formatTimestamp,
} from "plgg-db-migration/domain/usecase/newMigration";
import {
  joinPath,
  readFileText,
} from "plgg-db-migration/vendors/fs";

test("formatTimestamp renders a 14-digit UTC stamp", () =>
  check(
    formatTimestamp(
      new Date(Date.UTC(2026, 5, 27, 18, 15, 0)),
    ),
    toBe("20260627181500"),
  ));

test("newMigration writes a timestamped up/down skeleton and returns its path", async () => {
  const dir = mkdtempSync(
    joinPath(tmpdir(), "plgg-dbm-new-"),
  );
  const written = await newMigration(
    dir,
    "create_users",
    new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
  );
  if (!isOk(written)) {
    return check(true, toBe(false));
  }
  return all([
    check(
      written.content.endsWith(
        "20260101000000_create_users.sql",
      ),
      toBe(true),
    ),
    check(
      await readFileText(written.content),
      okThen((text) =>
        all([
          check(
            text.includes("-- migrate:up"),
            toBe(true),
          ),
          check(
            text.includes("-- migrate:down"),
            toBe(true),
          ),
        ]),
      ),
    ),
  ]);
});

test("newMigration rejects a traversal name and writes nothing", async () => {
  const dir = mkdtempSync(
    joinPath(tmpdir(), "plgg-dbm-bad-"),
  );
  const result = await newMigration(
    dir,
    "../evil",
    new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
  );
  return all([
    check(
      result,
      errThen((e) =>
        check(e.content.kind, toBe("NameShape")),
      ),
    ),
    check(readdirSync(dir).length, toBe(0)),
  ]);
});

test("newMigration rejects separators, dot names, and blanks", async () => {
  const results = await Promise.all(
    ["a/b", "a\\b", "..", ".", "a b", ""].map(
      (bad) =>
        newMigration(
          "unused-dir",
          bad,
          new Date(Date.UTC(2026, 0, 1)),
        ),
    ),
  );
  return all(
    results.map((result) =>
      check(
        result,
        errThen((e) =>
          check(
            e.content.kind,
            toBe("NameShape"),
          ),
        ),
      ),
    ),
  );
});
