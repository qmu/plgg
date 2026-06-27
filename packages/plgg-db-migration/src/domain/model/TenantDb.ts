import { SoftStr } from "plgg";
import { Db } from "plgg-sql";
import { TenantId } from "plgg-db-migration/domain/model/TenantId";

/**
 * A resolved per-tenant SQLite database: the {@link TenantId} it belongs to, the
 * `plgg-sql` `Db` seam opened over it, and the `path` it lives at. The app
 * supplies this behind a `resolveTenantDb` seam, keeping the tool ignorant of
 * tenant topology.
 */
export type TenantDb = Readonly<{
  id: TenantId;
  db: Db;
  path: SoftStr;
}>;

/**
 * Constructs a {@link TenantDb}.
 */
export const tenantDb = (
  id: TenantId,
  db: Db,
  path: SoftStr,
): TenantDb => ({ id, db, path });
