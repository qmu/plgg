import {
  Box,
  refinedBrand,
  isSoftStr,
} from "plgg";
import {
  MigrationError,
  tenantShape,
} from "plgg-db-migration/domain/model/MigrationError";

/**
 * A branded tenant identifier for the on-demand per-tenant SQLite path. Branded
 * so a raw string can't be mistaken for a validated id, and so the keyed mutex
 * guards a deliberately-constructed value.
 *
 * The id doubles as the safety boundary for the per-tenant DB path: an app's
 * `resolveTenantDb` seam builds a filesystem path from it. So the brand admits
 * only a single safe path segment — `[A-Za-z0-9_-]`, 1–64 chars — rejecting the
 * separators (`/`, `\`), the dot segments (`.`, `..`), and the NUL byte that
 * would let a `path.join(baseDir, id + ".sqlite")` escape a tenant's directory
 * and read or write another tenant's database.
 */
export type TenantId = Box<"TenantId", string>;

const TENANT_ID = /^[A-Za-z0-9_-]{1,64}$/;

const tenantId = refinedBrand<
  "TenantId",
  string,
  MigrationError
>(
  "TenantId",
  (v): v is string =>
    isSoftStr(v) && TENANT_ID.test(v),
  (v) =>
    tenantShape(
      "a tenant id must be 1–64 characters of letters, digits, hyphen, or underscore",
      v,
    ),
);

/** Type guard for {@link TenantId}. */
export const isTenantId = tenantId.is;

/**
 * Validates an unknown value into a {@link TenantId}, or fails with a
 * `TenantShape` {@link MigrationError}.
 */
export const asTenantId = tenantId.as;

/** The underlying string of a {@link TenantId}. */
export const tenantIdString = tenantId.unwrap;
