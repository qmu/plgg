import {
  Box,
  Num,
  InvalidError,
  box,
  refinedBrand,
  invalidError,
  isSoftStr,
} from "plgg";
import { freshOpaque } from "plgg-auth/Oidc/model/Tokens";
import { Role } from "plgg-auth/Account/model/Role";

/**
 * A single-use invite token in its **plaintext** form — the CSPRNG string shown
 * to the admin exactly once (the copy-paste link is a client concern). Never
 * persisted: only its {@link InviteHash} is stored, mirroring the refresh-token
 * hash-at-rest discipline.
 */
export type InviteToken = Box<
  "InviteToken",
  string
>;

const inviteToken = refinedBrand<
  "InviteToken",
  string,
  InvalidError
>(
  "InviteToken",
  (v): v is string => isSoftStr(v) && v.length > 0,
  () =>
    invalidError({
      message:
        "an invite token must be a non-empty string",
    }),
);

/** Type guard for {@link InviteToken}. */
export const isInviteToken = inviteToken.is;

/** Validate an unknown value into an {@link InviteToken}. */
export const asInviteToken = inviteToken.as;

/** The underlying plaintext string of an {@link InviteToken}. */
export const inviteTokenString =
  inviteToken.unwrap;

/** Mint a fresh CSPRNG invite token (shown once, then only its hash is kept). */
export const freshInviteToken = (): InviteToken =>
  box("InviteToken")(freshOpaque());

/**
 * The stored SHA-256 (base64url) hash of an {@link InviteToken}. Redemption
 * hashes the presented token and looks it up by this — the plaintext is never
 * at rest.
 */
export type InviteHash = Box<
  "InviteHash",
  string
>;

const inviteHash = refinedBrand<
  "InviteHash",
  string,
  InvalidError
>(
  "InviteHash",
  (v): v is string =>
    isSoftStr(v) && /^[A-Za-z0-9_-]{43}$/.test(v),
  () =>
    invalidError({
      message:
        "an invite hash must be a 43-char base64url SHA-256 digest",
    }),
);

/** Type guard for {@link InviteHash}. */
export const isInviteHash = inviteHash.is;

/** Validate an unknown value into an {@link InviteHash}. */
export const asInviteHash = inviteHash.as;

/** The underlying string of an {@link InviteHash}. */
export const inviteHashString = inviteHash.unwrap;

/**
 * A stored invite: the token's {@link InviteHash}, the {@link Role} it grants on
 * redemption (carried, not hardcoded, so an admin-invite is a data change), and
 * an expiry (epoch seconds, `Num`). Pure data.
 */
export type Invite = Readonly<{
  hash: InviteHash;
  role: Role;
  expiresAt: Num;
}>;

/** Construct an {@link Invite}. */
export const invite = (
  hash: InviteHash,
  role: Role,
  expiresAt: Num,
): Invite => ({ hash, role, expiresAt });
