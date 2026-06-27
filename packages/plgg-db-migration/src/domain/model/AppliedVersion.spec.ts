import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import {
  asVersion,
  versionString,
} from "plgg-db-migration/domain/model/Version";
import { appliedVersion } from "plgg-db-migration/domain/model/AppliedVersion";

test("appliedVersion carries its version and applied-at timestamp", () =>
  check(
    asVersion("20260627181500"),
    okThen((version) => {
      const row = appliedVersion(
        version,
        "2026-06-27T18:15:00Z",
      );
      return all([
        check(
          versionString(row.version),
          toBe("20260627181500"),
        ),
        check(
          row.appliedAt,
          toBe("2026-06-27T18:15:00Z"),
        ),
      ]);
    }),
  ));
