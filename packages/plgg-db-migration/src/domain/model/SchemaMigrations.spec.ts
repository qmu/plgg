import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { asVersion } from "plgg-db-migration/domain/model/Version";
import { appliedVersion } from "plgg-db-migration/domain/model/AppliedVersion";
import { isApplied } from "plgg-db-migration/domain/model/SchemaMigrations";

test("isApplied is true for a recorded version, false otherwise", () =>
  check(
    asVersion("20260101000000"),
    okThen((applied) =>
      check(
        asVersion("20260202000000"),
        okThen((pending) =>
          all([
            check(
              isApplied(
                [
                  appliedVersion(applied, "2026-01-01"),
                ],
                applied,
              ),
              toBe(true),
            ),
            check(
              isApplied(
                [
                  appliedVersion(applied, "2026-01-01"),
                ],
                pending,
              ),
              toBe(false),
            ),
            check(isApplied([], applied), toBe(false)),
          ]),
        ),
      ),
    ),
  ));
