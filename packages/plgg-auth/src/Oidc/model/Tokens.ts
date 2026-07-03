import {
  Box,
  InvalidError,
  invalidError,
  refinedBrand,
  isSoftStr,
  box,
} from "plgg";
import {
  base64UrlString,
  encodeBase64Url,
} from "plgg-auth/Jose/model/Base64Url";

const nonEmpty = <const TAG extends string>(
  tag: TAG,
  what: string,
) =>
  refinedBrand<TAG, string, InvalidError>(
    tag,
    (v): v is string =>
      isSoftStr(v) && v.length > 0,
    () =>
      invalidError({
        message: `${what} must be a non-empty string`,
      }),
  );

/** A branded end-user identifier (`sub`). */
export type Subject = Box<"Subject", string>;
const subject = nonEmpty("Subject", "a subject");
export const isSubject = subject.is;
export const asSubject = subject.as;
export const subjectString = subject.unwrap;

/** A branded single-use authorization code. */
export type AuthCode = Box<"AuthCode", string>;
const authCode = nonEmpty(
  "AuthCode",
  "an authorization code",
);
export const isAuthCode = authCode.is;
export const asAuthCode = authCode.as;
export const authCodeString = authCode.unwrap;

/** A branded opaque bearer access token. */
export type AccessToken = Box<
  "AccessToken",
  string
>;
const accessToken = nonEmpty(
  "AccessToken",
  "an access token",
);
export const isAccessToken = accessToken.is;
export const asAccessToken = accessToken.as;
export const accessTokenString =
  accessToken.unwrap;

/** A branded OP session identifier (cookie value). */
export type SessionId = Box<"SessionId", string>;
const sessionId = nonEmpty(
  "SessionId",
  "a session id",
);
export const isSessionId = sessionId.is;
export const asSessionId = sessionId.as;
export const sessionIdString = sessionId.unwrap;

/**
 * A branded handle for an authorization request
 * parked while the end-user authenticates.
 */
export type PendingRequestId = Box<
  "PendingRequestId",
  string
>;
const pendingRequestId = nonEmpty(
  "PendingRequestId",
  "a pending request id",
);
export const isPendingRequestId =
  pendingRequestId.is;
export const asPendingRequestId =
  pendingRequestId.as;
export const pendingRequestIdString =
  pendingRequestId.unwrap;

/**
 * 32 CSPRNG bytes as 43 base64url characters —
 * the entropy source for every issued
 * code/token/id/session (≥ the 128-bit floor
 * RFC 6749 §10.10 requires). The one impure
 * generator in the domain, kept here so issuance
 * usecases stay declarative.
 */
export const freshOpaque = (): string =>
  base64UrlString(
    encodeBase64Url(
      crypto.getRandomValues(new Uint8Array(32)),
    ),
  );

/** A fresh single-use authorization code. */
export const freshAuthCode = (): AuthCode =>
  box("AuthCode")(freshOpaque());

/** A fresh opaque access token. */
export const freshAccessToken = (): AccessToken =>
  box("AccessToken")(freshOpaque());

/** A fresh session id. */
export const freshSessionId = (): SessionId =>
  box("SessionId")(freshOpaque());

/** A fresh pending-request handle. */
export const freshPendingRequestId =
  (): PendingRequestId =>
    box("PendingRequestId")(freshOpaque());
