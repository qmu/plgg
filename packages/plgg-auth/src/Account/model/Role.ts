import {
  Result,
  InvalidError,
  ok,
  err,
  invalidError,
  isSoftStr,
} from "plgg";

/**
 * The closed set of authorities a {@link Subject} can hold. An app-side
 * membership value, not an OIDC scope: revoking it is one `DELETE` and the
 * account survives. Consumed with {@link matchRole} so an added role is a `tsc`
 * error at every fold, not a runtime surprise.
 */
export type Role = "admin" | "guest";

/** Validate an unknown value into a {@link Role}, else an `InvalidError`. */
export const asRole = (
  v: unknown,
): Result<Role, InvalidError> =>
  isSoftStr(v) && (v === "admin" || v === "guest")
    ? ok(v)
    : err(
        invalidError({
          message:
            'a role must be "admin" or "guest"',
        }),
      );

/** Exhaustive fold over a {@link Role}. */
export const matchRole =
  <R>(onAdmin: () => R, onGuest: () => R) =>
  (role: Role): R =>
    role === "admin" ? onAdmin() : onGuest();
