import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import {
  asTenantId,
  isTenantId,
  tenantIdString,
} from "plgg-db-migration/domain/model/TenantId";

test("asTenantId accepts a non-empty string", () =>
  check(
    asTenantId("tenant-4001"),
    okThen((t) =>
      check(
        tenantIdString(t),
        toBe("tenant-4001"),
      ),
    ),
  ));

test("asTenantId rejects an empty string and a non-string", () =>
  all([
    check(
      asTenantId(""),
      errThen((e) =>
        check(
          e.content.kind,
          toBe("TenantShape"),
        ),
      ),
    ),
    check(
      asTenantId(42),
      errThen((e) =>
        check(
          e.content.kind,
          toBe("TenantShape"),
        ),
      ),
    ),
  ]));

test("asTenantId is idempotent; isTenantId guards branded values", () =>
  check(
    asTenantId("acme"),
    okThen((t) =>
      all([
        check(isTenantId("acme"), toBe(false)),
        check(isTenantId(t), toBe(true)),
        check(
          asTenantId(t),
          okThen((again) =>
            check(
              tenantIdString(again),
              toBe("acme"),
            ),
          ),
        ),
      ]),
    ),
  ));
