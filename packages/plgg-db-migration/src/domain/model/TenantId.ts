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
 */
export type TenantId = Box<"TenantId", string>;

const tenantId = refinedBrand<
  "TenantId",
  string,
  MigrationError
>(
  "TenantId",
  (v): v is string =>
    isSoftStr(v) && v.length > 0,
  (v) =>
    tenantShape(
      "a tenant id must be a non-empty string",
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
