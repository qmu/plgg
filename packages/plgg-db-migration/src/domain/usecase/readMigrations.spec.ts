import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { versionString } from "plgg-db-migration/domain/model/Version";
import { migrationDirItems } from "plgg-db-migration/domain/model/MigrationDir";
import { readMigrations } from "plgg-db-migration/domain/usecase/readMigrations";
import {
  joinPath,
  writeFileText,
} from "plgg-db-migration/vendors/fs";

const freshDir = (label: string): string =>
  mkdtempSync(
    joinPath(tmpdir(), `plgg-dbm-${label}-`),
  );

test("reads .sql files into an ordered MigrationDir, ignoring non-sql", async () => {
  const dir = freshDir("read");
  await writeFileText(
    joinPath(dir, "20260202000000_second.sql"),
    "-- migrate:up\nSELECT 2;\n-- migrate:down\nSELECT 0;\n",
  );
  await writeFileText(
    joinPath(dir, "20260101000000_first.sql"),
    "-- migrate:up\nSELECT 1;\n",
  );
  await writeFileText(
    joinPath(dir, "README.md"),
    "ignore me",
  );
  return check(
    await readMigrations(dir),
    okThen((mdir) =>
      all([
        check(
          migrationDirItems(mdir).length,
          toBe(2),
        ),
        check(
          migrationDirItems(mdir).map((m) =>
            versionString(m.version),
          ),
          toEqual([
            "20260101000000",
            "20260202000000",
          ]),
        ),
        check(
          migrationDirItems(mdir).map(
            (m) => m.name,
          ),
          toEqual(["first", "second"]),
        ),
      ]),
    ),
  );
});

test("a .sql file with a non-timestamp prefix is a VersionShape error", async () => {
  const dir = freshDir("badname");
  await writeFileText(
    joinPath(dir, "not_a_version.sql"),
    "-- migrate:up\nSELECT 1;\n",
  );
  return check(
    await readMigrations(dir),
    errThen((e) =>
      check(e.content.kind, toBe("VersionShape")),
    ),
  );
});

test("a .sql file missing its up section is a ParseFailure", async () => {
  const dir = freshDir("noup");
  await writeFileText(
    joinPath(dir, "20260303000000_broken.sql"),
    "-- migrate:down\nDROP TABLE t;\n",
  );
  return check(
    await readMigrations(dir),
    errThen((e) =>
      check(e.content.kind, toBe("ParseFailure")),
    ),
  );
});

test("a missing directory is an IoFailure", async () =>
  check(
    await readMigrations(
      joinPath(tmpdir(), "plgg-dbm-missing-xyz-123"),
    ),
    errThen((e) =>
      check(e.content.kind, toBe("IoFailure")),
    ),
  ));

test("an empty directory yields an empty MigrationDir", async () => {
  const dir = freshDir("empty");
  return check(
    await readMigrations(dir),
    okThen((mdir) =>
      toEqual([])(migrationDirItems(mdir)),
    ),
  );
});
