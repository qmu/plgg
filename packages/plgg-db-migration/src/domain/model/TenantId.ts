import {
  Box,
  SoftStr,
  Result,
  ok,
  err,
  box,
  isBoxWithTag,
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

/** A value qualifies as a tenant id iff it is a non-empty string. */
const qualify = (
  value: unknown,
): value is string =>
  isSoftStr(value) && value.length > 0;

/** Type guard for {@link TenantId}. */
export const isTenantId = (
  value: unknown,
): value is TenantId =>
  isBoxWithTag("TenantId")(value) &&
  qualify(value.content);

/**
 * Validates an unknown value into a {@link TenantId}, or fails with a
 * `TenantShape` {@link MigrationError}.
 */
export const asTenantId = (
  value: unknown,
): Result<TenantId, MigrationError> =>
  isTenantId(value)
    ? ok(value)
    : qualify(value)
      ? ok(box("TenantId")(value))
      : err(
          tenantShape(
            "a tenant id must be a non-empty string",
            value,
          ),
        );

/** The underlying string of a {@link TenantId}. */
export const tenantIdString = (
  tenantId: TenantId,
): SoftStr => tenantId.content;
