import {
  Result,
  InvalidError,
  pipe,
  cast,
  mapResult,
  asRawObj,
  forProp,
  asNum,
} from "plgg";
import { asSubject } from "plgg-auth/Oidc/model/Tokens";
import {
  Account,
  account,
  asUsername,
  asPasswordHash,
} from "plgg-auth/Account/model/Account";
import {
  Role,
  asRole,
} from "plgg-auth/Account/model/Role";
import {
  Invite,
  invite,
  asInviteHash,
} from "plgg-auth/Account/model/Invite";

/**
 * Decode an `accounts` row through the domain casters. A mis-shaped row yields
 * an `Err` the store folds to `None` (a shape mismatch reads as absent, never a
 * throw) — the `Sql/rows.ts` idiom.
 */
export const asAccountRow = (
  row: unknown,
): Result<Account, InvalidError> =>
  pipe(
    cast(
      row,
      asRawObj,
      forProp("subject", asSubject),
      forProp("username", asUsername),
      forProp("password_hash", asPasswordHash),
      forProp("created_at", asNum),
    ),
    mapResult((r) =>
      account(
        r.subject,
        r.username,
        r.password_hash,
        r.created_at,
      ),
    ),
  );

/** Decode an `account_roles` row's role. */
export const asRoleRow = (
  row: unknown,
): Result<Role, InvalidError> =>
  pipe(
    cast(row, asRawObj, forProp("role", asRole)),
    mapResult((r) => r.role),
  );

/** Decode an `account_invites` row. */
export const asInviteRow = (
  row: unknown,
): Result<Invite, InvalidError> =>
  pipe(
    cast(
      row,
      asRawObj,
      forProp("token_hash", asInviteHash),
      forProp("role", asRole),
      forProp("expires_at", asNum),
    ),
    mapResult((r) =>
      invite(r.token_hash, r.role, r.expires_at),
    ),
  );
