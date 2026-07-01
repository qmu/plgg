import {
  test,
  check,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { none } from "plgg";
import {
  asVersion,
  versionString,
} from "plgg-db-migration/domain/model/Version";
import {
  migration,
  Migration,
} from "plgg-db-migration/domain/model/Migration";
import {
  asMigrationDir,
  migrationDirItems,
} from "plgg-db-migration/domain/model/MigrationDir";
import { Version } from "plgg-db-migration/domain/model/Version";

const mig = (version: Version): Migration =>
  migration({
    version,
    name: "m",
    up: "SELECT 1;",
    down: none(),
    upTransaction: true,
    downTransaction: true,
  });

test("asMigrationDir sorts ascending by version", () =>
  check(
    asVersion("20260101000000"),
    okThen((v1) =>
      check(
        asVersion("20260202000000"),
        okThen((v2) =>
          check(
            asMigrationDir([mig(v2), mig(v1)]),
            okThen((dir) =>
              check(
                migrationDirItems(dir).map((m) =>
                  versionString(m.version),
                ),
                toEqual([
                  "20260101000000",
                  "20260202000000",
                ]),
              ),
            ),
          ),
        ),
      ),
    ),
  ));

test("asMigrationDir rejects a duplicate version", () =>
  check(
    asVersion("20260101000000"),
    okThen((v1) =>
      check(
        asMigrationDir([mig(v1), mig(v1)]),
        errThen((e) =>
          check(
            e.content.kind,
            toBe("OrderingViolation"),
          ),
        ),
      ),
    ),
  ));

test("asMigrationDir accepts an empty directory", () =>
  check(
    asMigrationDir([]),
    okThen((dir) =>
      check(migrationDirItems(dir), toEqual([])),
    ),
  ));
