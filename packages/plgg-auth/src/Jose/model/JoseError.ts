import {
  Box,
  SoftStr,
  Option,
  Result,
  InvalidError,
  box,
  pattern,
  fromNullable,
  foldThrown,
  tryCatch,
} from "plgg";

/**
 * The kind of a {@link JoseError}: which JOSE rule
 * was violated. A closed literal union so a fold
 * over it is exhaustive, and so each JWT claim
 * check fails as a distinct, testable value.
 */
export type JoseErrorKind =
  | "DecodeFailure"
  | "KeyFailure"
  | "SignFailure"
  | "VerifyFailure"
  | "AlgMismatch"
  | "UnknownKid"
  | "IssuerMismatch"
  | "AudienceMismatch"
  | "Expired"
  | "Premature"
  | "NonceMismatch";

/**
 * A failure raised while encoding, signing,
 * verifying, or validating JOSE material. Pure
 * tagged data (a `Box`, not an `Error` subclass)
 * so it rides the `Result`/`proc` error channel
 * like any plgg error. The `kind` discriminates
 * the variant; `cause` preserves an underlying
 * throw or nested error when there is one.
 */
export type JoseError = Box<
  "JoseError",
  {
    kind: JoseErrorKind;
    message: SoftStr;
    cause: Option<unknown>;
  }
>;

const make =
  (kind: JoseErrorKind) =>
  (
    message: SoftStr,
    cause?: unknown,
  ): JoseError =>
    box("JoseError")({
      kind,
      message,
      cause: fromNullable(cause),
    });

/** Base64url / JSON / compact-shape decode failed. */
export const decodeFailure = make(
  "DecodeFailure",
);

/** JWK import, export, or generation failed. */
export const keyFailure = make("KeyFailure");

/** The signing operation itself failed. */
export const signFailure = make("SignFailure");

/** The signature did not verify over the input. */
export const verifyFailure = make(
  "VerifyFailure",
);

/** A JWS `alg` other than RS256 (incl. `none`). */
export const algMismatch = make("AlgMismatch");

/** No JWK matches the JWS header's `kid`. */
export const unknownKid = make("UnknownKid");

/** The JWT `iss` claim is not the expected issuer. */
export const issuerMismatch = make(
  "IssuerMismatch",
);

/** No JWT `aud` entry matches the expected audience. */
export const audienceMismatch = make(
  "AudienceMismatch",
);

/** The JWT `exp` claim is in the past. */
export const expired = make("Expired");

/** The JWT `nbf` claim is in the future. */
export const premature = make("Premature");

/** The JWT `nonce` is missing or does not match. */
export const nonceMismatch = make(
  "NonceMismatch",
);

/**
 * Pattern matcher for folding a {@link JoseError}
 * with `match` by tag.
 */
export const joseError$ = () =>
  pattern("JoseError")();

/** The discriminating kind of a {@link JoseError}. */
export const joseErrorKind = (
  e: JoseError,
): JoseErrorKind => e.content.kind;

/**
 * Lifts an unknown thrown cause into a
 * {@link JoseError} of one `kind`, preserving the
 * chain.
 */
export const joseErrorFromThrown =
  (kind: JoseErrorKind) =>
  (cause: unknown): JoseError =>
    foldThrown<JoseError>(
      (e) => make(kind)(e.message, e),
      () => make(kind)("crypto operation failed"),
    )(cause);

/**
 * Re-tags a boundary {@link InvalidError} as a
 * {@link JoseError} of one `kind`, keeping the
 * original as the cause.
 */
export const joseErrorFromInvalid =
  (kind: JoseErrorKind) =>
  (e: InvalidError): JoseError =>
    make(kind)(e.content.message, e);

/**
 * Runs a WebCrypto operation, folding a rejection
 * into a value-level {@link JoseError} of `kind`.
 * The one place `crypto.subtle`'s throwing surface
 * is lifted onto the `Result` channel.
 */
export const liftJose =
  <T>(kind: JoseErrorKind) =>
  (
    op: () => Promise<T>,
  ): Promise<Result<T, JoseError>> =>
    tryCatch(
      (f: () => Promise<T>): Promise<T> => f(),
      joseErrorFromThrown(kind),
    )(op);
