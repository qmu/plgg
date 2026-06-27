import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { none } from "plgg";
import { asVersion } from "plgg-db-migration/domain/model/Version";
import { migration } from "plgg-db-migration/domain/model/Migration";
import { appliedVersion } from "plgg-db-migration/domain/model/AppliedVersion";
import { plan } from "plgg-db-migration/domain/model/Plan";

test("plan carries the pending migrations and the applied rows", () =>
  check(
    asVersion("20260101000000"),
    okThen((applied) =>
      check(
        asVersion("20260202000000"),
        okThen((pending) => {
          const p = plan(
            [
              migration({
                version: pending,
                name: "next",
                up: "SELECT 1;",
                down: none(),
                upTransaction: true,
                downTransaction: true,
              }),
            ],
            [
              appliedVersion(
                applied,
                "2026-01-01",
              ),
            ],
          );
          return all([
            check(p.pending.length, toBe(1)),
            check(p.applied.length, toBe(1)),
          ]);
        }),
      ),
    ),
  ));
