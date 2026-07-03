import {
  Box,
  SoftStr,
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

/**
 * A branded OAuth client identifier. Branded so
 * an arbitrary request string can never be
 * mistaken for a validated client id.
 */
export type ClientId = Box<"ClientId", string>;

const clientId = refinedBrand<
  "ClientId",
  string,
  InvalidError
>(
  "ClientId",
  (v): v is string =>
    isSoftStr(v) && v.length > 0,
  () =>
    invalidError({
      message:
        "a client id must be a non-empty string",
    }),
);

/** Type guard for {@link ClientId}. */
export const isClientId = clientId.is;

/** Validates an unknown value into a {@link ClientId}. */
export const asClientId = clientId.as;

/** The underlying string of a {@link ClientId}. */
export const clientIdString = clientId.unwrap;

/**
 * A branded SHA-256 client-secret digest
 * (base64url). Only the digest is ever stored or
 * compared — a raw secret is unrepresentable in
 * the {@link Client} model.
 */
export type ClientSecretHash = Box<
  "ClientSecretHash",
  string
>;

const clientSecretHash = refinedBrand<
  "ClientSecretHash",
  string,
  InvalidError
>(
  "ClientSecretHash",
  (v): v is string =>
    isSoftStr(v) && /^[A-Za-z0-9_-]{43}$/.test(v),
  () =>
    invalidError({
      message:
        "a client secret hash must be a 43-char base64url SHA-256 digest",
    }),
);

/** Type guard for {@link ClientSecretHash}. */
export const isClientSecretHash =
  clientSecretHash.is;

/** Validates an unknown value into a {@link ClientSecretHash}. */
export const asClientSecretHash =
  clientSecretHash.as;

/** The underlying string of a {@link ClientSecretHash}. */
export const clientSecretHashString =
  clientSecretHash.unwrap;

/**
 * A branded registered redirect URI: absolute
 * http(s), no fragment (RFC 6749 §3.1.2).
 * Matching is always exact string equality —
 * never prefix or pattern matching.
 */
export type RedirectUri = Box<
  "RedirectUri",
  string
>;

const redirectUri = refinedBrand<
  "RedirectUri",
  string,
  InvalidError
>(
  "RedirectUri",
  (v): v is string =>
    isSoftStr(v) &&
    (v.startsWith("https://") ||
      v.startsWith("http://")) &&
    !v.includes("#") &&
    URL.canParse(v),
  () =>
    invalidError({
      message:
        "a redirect uri must be an absolute http(s) URL without a fragment",
    }),
);

/** Type guard for {@link RedirectUri}. */
export const isRedirectUri = redirectUri.is;

/** Validates an unknown value into a {@link RedirectUri}. */
export const asRedirectUri = redirectUri.as;

/** The underlying string of a {@link RedirectUri}. */
export const redirectUriString =
  redirectUri.unwrap;

/**
 * A registered OAuth client. A public client
 * (`secretHash: None`) authenticates with PKCE
 * only; a confidential client presents its
 * secret, which is compared as a SHA-256 digest.
 */
export type Client = Readonly<{
  id: ClientId;
  secretHash: Option<ClientSecretHash>;
  redirectUris: ReadonlyArray<RedirectUri>;
}>;

/** Whether a redirect uri is registered (exact match). */
export const hasRedirectUri = (
  client: Client,
  uri: SoftStr,
): boolean =>
  client.redirectUris.some(
    (registered) =>
      redirectUriString(registered) === uri,
  );

/**
 * Hashes a client secret for storage or
 * comparison: SHA-256, base64url. Always
 * produces a valid {@link ClientSecretHash}
 * shape, so the result is cast through the
 * boundary caster and can be trusted.
 */
export const hashClientSecret = (
  secret: SoftStr,
): Promise<Result<ClientSecretHash, JoseError>> =>
  liftJose<ArrayBuffer>("KeyFailure")(() =>
    crypto.subtle.digest(
      "SHA-256",
      toBufferSource(utf8Bytes(secret)),
    ),
  ).then(
    mapResult(
      (digest: ArrayBuffer): ClientSecretHash =>
        // A SHA-256 digest always encodes to 43
        // base64url chars, so the brand holds by
        // construction.
        box("ClientSecretHash")(
          base64UrlString(
            encodeBase64Url(
              new Uint8Array(digest),
            ),
          ),
        ),
    ),
  );
