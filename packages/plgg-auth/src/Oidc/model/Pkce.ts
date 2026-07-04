import {
  Box,
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
 * A branded PKCE code verifier (RFC 7636 §4.1):
 * 43–128 unreserved characters.
 */
export type CodeVerifier = Box<
  "CodeVerifier",
  string
>;

const codeVerifier = refinedBrand<
  "CodeVerifier",
  string,
  InvalidError
>(
  "CodeVerifier",
  (v): v is string =>
    isSoftStr(v) &&
    /^[A-Za-z0-9\-._~]{43,128}$/.test(v),
  () =>
    invalidError({
      message:
        "a code verifier must be 43-128 unreserved characters (RFC 7636)",
    }),
);

/** Type guard for {@link CodeVerifier}. */
export const isCodeVerifier = codeVerifier.is;

/** Validates an unknown value into a {@link CodeVerifier}. */
export const asCodeVerifier = codeVerifier.as;

/** The underlying string of a {@link CodeVerifier}. */
export const codeVerifierString =
  codeVerifier.unwrap;

/**
 * A branded S256 PKCE code challenge: the
 * base64url SHA-256 of a verifier (43 chars).
 * `plain` is not modeled — S256 is the only
 * supported method.
 */
export type CodeChallenge = Box<
  "CodeChallenge",
  string
>;

const codeChallenge = refinedBrand<
  "CodeChallenge",
  string,
  InvalidError
>(
  "CodeChallenge",
  (v): v is string =>
    isSoftStr(v) && /^[A-Za-z0-9_-]{43}$/.test(v),
  () =>
    invalidError({
      message:
        "a code challenge must be a 43-char base64url S256 digest",
    }),
);

/** Type guard for {@link CodeChallenge}. */
export const isCodeChallenge = codeChallenge.is;

/** Validates an unknown value into a {@link CodeChallenge}. */
export const asCodeChallenge = codeChallenge.as;

/** The underlying string of a {@link CodeChallenge}. */
export const codeChallengeString =
  codeChallenge.unwrap;

/**
 * Computes the S256 challenge of a verifier —
 * used by the token endpoint to check a grant
 * and by RP-side code to build a request.
 */
export const computeS256Challenge = (
  verifier: CodeVerifier,
): Promise<Result<CodeChallenge, JoseError>> =>
  liftJose<ArrayBuffer>("KeyFailure")(() =>
    crypto.subtle.digest(
      "SHA-256",
      toBufferSource(
        utf8Bytes(codeVerifierString(verifier)),
      ),
    ),
  ).then(
    mapResult(
      (digest: ArrayBuffer): CodeChallenge =>
        // SHA-256 always encodes to 43 base64url
        // chars, so the brand holds.
        box("CodeChallenge")(
          base64UrlString(
            encodeBase64Url(
              new Uint8Array(digest),
            ),
          ),
        ),
    ),
  );

/** Whether a verifier satisfies a challenge. */
export const pkceMatches = (
  computed: CodeChallenge,
  expected: CodeChallenge,
): boolean =>
  codeChallengeString(computed) ===
  codeChallengeString(expected);
