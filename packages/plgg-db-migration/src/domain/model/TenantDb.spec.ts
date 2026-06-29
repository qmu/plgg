import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { none } from "plgg";
import { Db } from "plgg-sql";
import { asTenantId } from "plgg-db-migration/domain/model/TenantId";
import { tenantDb } from "plgg-db-migration/domain/model/TenantDb";

const stubDb: Db = {
  all: async () => [],
  run: async () => ({
    changes: 0,
    lastInsertId: none(),
  }),
  execScript: async () => {},
  begin: async () => {},
  commit: async () => {},
  rollback: async () => {},
};

test("tenantDb carries its id, db seam, and path", () =>
  check(
    asTenantId("tenant-7"),
    okThen((id) => {
      const t = tenantDb(
        id,
        stubDb,
        "/var/tenants/tenant-7.sqlite",
      );
      return all([
        check(t.id, toBe(id)),
        check(t.db, toBe(stubDb)),
        check(
          t.path,
          toBe("/var/tenants/tenant-7.sqlite"),
        ),
      ]);
    }),
  ));
