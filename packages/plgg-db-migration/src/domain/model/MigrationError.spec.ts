import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { matchOption } from "plgg";
import {
  parseFailure,
  orderingViolation,
  irreversibleDown,
  dialectMismatch,
  versionShape,
  tenantShape,
  nameShape,
  ioFailure,
  ledgerCorrupt,
  missingMigration,
} from "plgg-db-migration/domain/model/MigrationError";

const causeTag = matchOption(
  () => "none",
  () => "some",
);

test("each constructor tags a MigrationError with its kind", () =>
  all([
    check(
      parseFailure("x").__tag,
      toBe("MigrationError"),
    ),
    check(
      parseFailure("x").content.kind,
      toBe("ParseFailure"),
    ),
    check(
      orderingViolation("x").content.kind,
      toBe("OrderingViolation"),
    ),
    check(
      irreversibleDown("x").content.kind,
      toBe("IrreversibleDown"),
    ),
    check(
      dialectMismatch("x").content.kind,
      toBe("DialectMismatch"),
    ),
    check(
      versionShape("x").content.kind,
      toBe("VersionShape"),
    ),
    check(
      tenantShape("x").content.kind,
      toBe("TenantShape"),
    ),
    check(
      nameShape("x").content.kind,
      toBe("NameShape"),
    ),
    check(
      ledgerCorrupt("x").content.kind,
      toBe("LedgerCorrupt"),
    ),
    check(
      missingMigration("x").content.kind,
      toBe("MissingMigration"),
    ),
    check(
      ioFailure("x").content.kind,
      toBe("IoFailure"),
    ),
  ]));

test("the message is carried, and cause is None without one / Some with one", () =>
  all([
    check(
      parseFailure("boom").content.message,
      toBe("boom"),
    ),
    check(
      causeTag(parseFailure("x").content.cause),
      toBe("none"),
    ),
    check(
      causeTag(
        parseFailure("x", new Error("e")).content
          .cause,
      ),
      toBe("some"),
    ),
  ]));
