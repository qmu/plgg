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

test("asTenantId rejects path-traversal and separator ids", () =>
  all(
    [
      "..",
      "../x",
      "a/b",
      "a\\b",
      "a\0b",
      ".hidden",
      "a b",
      "a.b",
      "%2e%2e",
      "x".repeat(65),
    ].map((bad) =>
      check(
        asTenantId(bad),
        errThen((e) =>
          check(
            e.content.kind,
            toBe("TenantShape"),
          ),
        ),
      ),
    ),
  ));

test("asTenantId accepts the 64-char boundary but rejects 65", () =>
  all([
    check(
      asTenantId("x".repeat(64)),
      okThen((t) =>
        check(tenantIdString(t).length, toBe(64)),
      ),
    ),
    check(
      asTenantId("x".repeat(65)),
      errThen((e) =>
        check(
          e.content.kind,
          toBe("TenantShape"),
        ),
      ),
    ),
  ]));

test("a traversal id never yields an Ok TenantId", () =>
  check(
    asTenantId("../tenant-victim/db"),
    errThen((e) =>
      check(e.content.kind, toBe("TenantShape")),
    ),
  ));

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
