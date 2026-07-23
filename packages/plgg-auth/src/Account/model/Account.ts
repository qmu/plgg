import {
  Box,
  Num,
  Result,
  InvalidError,
  box,
  ok,
  err,
  refinedBrand,
  invalidError,
  isSoftStr,
} from "plgg";
import {
  Subject,
  freshOpaque,
} from "plgg-auth/Oidc/model/Tokens";

/**
 * A branded, normalized username. Normalization is **trim + case-fold
 * (lowercase)** so "Alice", " alice ", and "ALICE" name one account and the
 * `accounts.username UNIQUE` constraint means what a human expects. The brand is
 * carried, not a bare string, so an un-normalized string can never be mistaken
 * for a lookup key.
 */
export type Username = Box<"Username", string>;

/** The underlying normalized string of a {@link Username}. */
export const usernameString = (
  u: Username,
): string => u.content;

/**
 * Validate and normalize an unknown value into a {@link Username} (trim +
 * lowercase). Hand-defined (not `refinedBrand`) because the caster normalizes,
 * not merely validates. Used at every boundary a username enters — login, invite
 * redemption, row decode — so all three compare the same normalized form.
 */
export const asUsername = (
  v: unknown,
): Result<Username, InvalidError> =>
  isSoftStr(v) && v.trim().length > 0
    ? ok(box("Username")(v.trim().toLowerCase()))
    : err(
        invalidError({
          message:
            "a username must be a non-empty string",
        }),
      );

/**
 * A branded PBKDF2 password hash: the self-describing
 * `pbkdf2$sha256$<iterations>$<salt>$<derived>` string that is stored — never a
 * plaintext password. The iteration count lives in the string so it can be
 * raised later without a schema migration.
 */
export type PasswordHash = Box<
  "PasswordHash",
  string
>;

const passwordHash = refinedBrand<
  "PasswordHash",
  string,
  InvalidError
>(
  "PasswordHash",
  (v): v is string =>
    isSoftStr(v) &&
    /^pbkdf2\$sha256\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/.test(
      v,
    ),
  () =>
    invalidError({
      message:
        "a password hash must be a pbkdf2$sha256 encoded string",
    }),
);

/** Type guard for {@link PasswordHash}. */
export const isPasswordHash = passwordHash.is;

/** Validate an unknown value into a {@link PasswordHash}. */
export const asPasswordHash = passwordHash.as;

/** The underlying encoded string of a {@link PasswordHash}. */
export const passwordHashString =
  passwordHash.unwrap;

/**
 * One account: the OIDC {@link Subject} it authenticates to, its normalized
 * {@link Username}, its {@link PasswordHash}, and a creation timestamp (epoch
 * seconds, as `Num`). Pure data — construction validates nothing (values are
 * cast at their boundaries).
 */
export type Account = Readonly<{
  subject: Subject;
  username: Username;
  passwordHash: PasswordHash;
  createdAt: Num;
}>;

/** Construct an {@link Account}. */
export const account = (
  subject: Subject,
  username: Username,
  passwordHash: PasswordHash,
  createdAt: Num,
): Account => ({
  subject,
  username,
  passwordHash,
  createdAt,
});

/**
 * Mint a fresh {@link Subject} for a newly-provisioned account — 32 CSPRNG bytes
 * as base64url, the same entropy floor plgg-auth's opaque ids use.
 */
export const freshSubject = (): Subject =>
  box("Subject")(freshOpaque());
