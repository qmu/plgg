import {
  Box,
  SoftStr,
  Num,
  Option,
  Result,
  InvalidError,
  invalidError,
  refinedBrand,
  isSoftStr,
  box,
  mapResult,
} from "plgg";
import {
  base64UrlString,
  encodeBase64Url,
  utf8Bytes,
  toBufferSource,
} from "plgg-auth/Jose/model/Base64Url";
import {
  JoseError,
  liftJose,
} from "plgg-auth/Jose/model/JoseError";
import { ClientId } from "plgg-auth/Oidc/model/Client";
import {
  Subject,
  freshOpaque,
} from "plgg-auth/Oidc/model/Tokens";
import { Scope } from "plgg-auth/Oidc/model/AuthorizationRequest";

/**
 * A branded opaque refresh token (the value
 * handed to the client). Only its SHA-256 hash is
 * ever stored — see {@link RefreshTokenHash}.
 */
export type RefreshToken = Box<
  "RefreshToken",
  string
>;

const refreshToken = refinedBrand<
  "RefreshToken",
  string,
  InvalidError
>(
  "RefreshToken",
  (v): v is string =>
    isSoftStr(v) && v.length > 0,
  () =>
    invalidError({
      message:
        "a refresh token must be a non-empty string",
    }),
);

/** Type guard for {@link RefreshToken}. */
export const isRefreshToken = refreshToken.is;

/** Validates an unknown value into a {@link RefreshToken}. */
export const asRefreshToken = refreshToken.as;

/** The underlying string of a {@link RefreshToken}. */
export const refreshTokenString =
  refreshToken.unwrap;

/** A fresh opaque refresh token. */
export const freshRefreshToken =
  (): RefreshToken =>
    box("RefreshToken")(freshOpaque());

/**
 * A branded SHA-256 refresh-token digest
 * (base64url) — the stored form, so a leaked DB
 * never yields a usable token.
 */
export type RefreshTokenHash = Box<
  "RefreshTokenHash",
  string
>;

const refreshTokenHash = refinedBrand<
  "RefreshTokenHash",
  string,
  InvalidError
>(
  "RefreshTokenHash",
  (v): v is string =>
    isSoftStr(v) && /^[A-Za-z0-9_-]{43}$/.test(v),
  () =>
    invalidError({
      message:
        "a refresh token hash must be a 43-char base64url SHA-256 digest",
    }),
);

/** Type guard for {@link RefreshTokenHash}. */
export const isRefreshTokenHash =
  refreshTokenHash.is;

/** Validates an unknown value into a {@link RefreshTokenHash}. */
export const asRefreshTokenHash =
  refreshTokenHash.as;

/** The underlying string of a {@link RefreshTokenHash}. */
export const refreshTokenHashString =
  refreshTokenHash.unwrap;

/**
 * Hashes a refresh token for storage or lookup:
 * SHA-256, base64url — the same one-way mapping
 * the client secret uses.
 */
export const hashRefreshToken = (
  token: RefreshToken,
): Promise<Result<RefreshTokenHash, JoseError>> =>
  liftJose<ArrayBuffer>("KeyFailure")(() =>
    crypto.subtle.digest(
      "SHA-256",
      toBufferSource(
        utf8Bytes(refreshTokenString(token)),
      ),
    ),
  ).then(
    mapResult(
      (digest: ArrayBuffer): RefreshTokenHash =>
        box("RefreshTokenHash")(
          base64UrlString(
            encodeBase64Url(
              new Uint8Array(digest),
            ),
          ),
        ),
    ),
  );

/**
 * A branded refresh-token family id: all tokens
 * descended from one original grant share it, so
 * a detected reuse can revoke the whole lineage
 * (OAuth 2.1 rotation guidance).
 */
export type FamilyId = Box<"FamilyId", string>;

const familyId = refinedBrand<
  "FamilyId",
  string,
  InvalidError
>(
  "FamilyId",
  (v): v is string =>
    isSoftStr(v) && v.length > 0,
  () =>
    invalidError({
      message:
        "a family id must be a non-empty string",
    }),
);

/** Type guard for {@link FamilyId}. */
export const isFamilyId = familyId.is;

/** Validates an unknown value into a {@link FamilyId}. */
export const asFamilyId = familyId.as;

/** The underlying string of a {@link FamilyId}. */
export const familyIdString = familyId.unwrap;

/** A fresh refresh-token family id. */
export const freshFamilyId = (): FamilyId =>
  box("FamilyId")(freshOpaque());

/** The lifecycle status of a stored refresh token. */
export type RefreshStatus =
  | "active"
  | "rotated"
  | "revoked";

/**
 * A stored refresh token: only its hash, plus the
 * binding and rotation lineage. Presenting a
 * `rotated` or `revoked` token is a reuse signal
 * that revokes the whole {@link FamilyId}.
 */
export type RefreshRecord = Readonly<{
  tokenHash: RefreshTokenHash;
  familyId: FamilyId;
  clientId: ClientId;
  subject: Subject;
  scopes: ReadonlyArray<Scope>;
  rotatedFrom: Option<RefreshTokenHash>;
  status: RefreshStatus;
  expiresAt: Num;
}>;

/** The scopes as a single space-delimited string (storage form). */
export const scopesToText = (
  scopes: ReadonlyArray<Scope>,
): SoftStr =>
  scopes.map((s) => s.content).join(" ");
