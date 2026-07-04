import {
  Box,
  SoftStr,
  Num,
  Option,
  box,
  pattern,
  fromNullable,
  foldThrown,
} from "plgg";

/**
 * The kind of an {@link OidcError}: which
 * protocol rule was violated. A closed literal
 * union so a fold over it is exhaustive; each
 * kind maps onto one RFC 6749 error code and
 * HTTP status.
 */
export type OidcErrorKind =
  | "InvalidRequest"
  | "InvalidClient"
  | "InvalidGrant"
  | "UnsupportedGrantType"
  | "UnsupportedResponseType"
  | "InvalidScope"
  | "UnknownPendingRequest"
  | "Unauthenticated"
  | "StoreFailure"
  | "ServerError";

/**
 * A failure raised while running the OIDC
 * protocol. Pure tagged data (a `Box`, not an
 * `Error` subclass) so it rides the
 * `Result`/`proc` error channel like any plgg
 * error.
 */
export type OidcError = Box<
  "OidcError",
  {
    kind: OidcErrorKind;
    message: SoftStr;
    cause: Option<unknown>;
  }
>;

const make =
  (kind: OidcErrorKind) =>
  (
    message: SoftStr,
    cause?: unknown,
  ): OidcError =>
    box("OidcError")({
      kind,
      message,
      cause: fromNullable(cause),
    });

/** The request is malformed or missing a parameter. */
export const invalidRequest = make(
  "InvalidRequest",
);

/** Client authentication failed. */
export const invalidClient = make(
  "InvalidClient",
);

/** The grant (code, PKCE, binding) is invalid. */
export const invalidGrant = make("InvalidGrant");

/** A `grant_type` this provider does not issue. */
export const unsupportedGrantType = make(
  "UnsupportedGrantType",
);

/** A `response_type` other than `code`. */
export const unsupportedResponseType = make(
  "UnsupportedResponseType",
);

/** The `scope` is malformed or lacks `openid`. */
export const invalidScope = make("InvalidScope");

/** The login callback names no pending request. */
export const unknownPendingRequest = make(
  "UnknownPendingRequest",
);

/** A protected endpoint got no valid credential. */
export const unauthenticated = make(
  "Unauthenticated",
);

/** The AuthStore rejected an operation. */
export const storeFailure = make("StoreFailure");

/** An unexpected provider-side failure. */
export const serverError = make("ServerError");

/**
 * Pattern matcher for folding an
 * {@link OidcError} with `match` by tag.
 */
export const oidcError$ = () =>
  pattern("OidcError")();

/** The discriminating kind of an {@link OidcError}. */
export const oidcErrorKind = (
  e: OidcError,
): OidcErrorKind => e.content.kind;

/**
 * Lifts an unknown thrown cause (a rejected
 * store promise) into a `StoreFailure`.
 */
export const toStoreFailure = (
  cause: unknown,
): OidcError =>
  foldThrown<OidcError>(
    (e) => storeFailure(e.message, e),
    () => storeFailure("store operation failed"),
  )(cause);

// Exhaustive by construction: a Record over the
// closed kind union fails to type-check when a
// kind is missing (the house alternative to
// `switch`).
const wireCodes: Readonly<
  Record<OidcErrorKind, SoftStr>
> = {
  InvalidRequest: "invalid_request",
  InvalidClient: "invalid_client",
  InvalidGrant: "invalid_grant",
  UnsupportedGrantType: "unsupported_grant_type",
  UnsupportedResponseType:
    "unsupported_response_type",
  InvalidScope: "invalid_scope",
  UnknownPendingRequest: "invalid_request",
  Unauthenticated: "invalid_token",
  StoreFailure: "server_error",
  ServerError: "server_error",
};

/**
 * The RFC 6749 wire code for an error kind —
 * what goes in the `error` member of an OAuth
 * error response or error redirect.
 */
export const oauthErrorCode = (
  e: OidcError,
): SoftStr => wireCodes[e.content.kind];

const statuses: Readonly<
  Record<OidcErrorKind, Num>
> = {
  InvalidRequest: 400,
  InvalidClient: 401,
  InvalidGrant: 400,
  UnsupportedGrantType: 400,
  UnsupportedResponseType: 400,
  InvalidScope: 400,
  UnknownPendingRequest: 400,
  Unauthenticated: 401,
  StoreFailure: 500,
  ServerError: 500,
};

/**
 * The HTTP status an error kind folds to on a
 * direct (non-redirect) error response
 * (RFC 6749 §5.2: `invalid_client` and a missing
 * bearer are 401, server faults are 500, the
 * rest are 400).
 */
export const oauthErrorStatus = (
  e: OidcError,
): Num => statuses[e.content.kind];
