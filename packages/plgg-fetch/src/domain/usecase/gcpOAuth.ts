import {
  PromisedResult,
  Result,
  SoftStr,
  InvalidError,
  Defect,
  ok,
  err,
  pipe,
  cast,
  asObj,
  asSoftStr,
  asNum,
  forProp,
  tryCatch,
  mapResult,
  matchOption,
  matchResult,
  defect,
} from "plgg";
import { HttpResponse } from "plgg-http";
import {
  GcpAccessToken,
  GcpJwtClaims,
  GcpServiceAccount,
  GcpTokenRequest,
  GCP_TOKEN_ENDPOINT,
  JWT_BEARER_GRANT_TYPE,
} from "plgg-fetch/domain/model/GcpOAuth";
import { post } from "plgg-fetch/domain/usecase/request";
import { decodeJsonBody } from "plgg-fetch/domain/usecase/decode";
import {
  rs256Sign,
  textToBase64Url,
  toBase64Url,
} from "plgg-fetch/vendors/webcrypto";

/**
 * The JOSE header of the assertion. Fixed: GCP accepts only
 * RS256 for a service-account JWT-bearer grant, so this is
 * a constant rather than a parameter.
 */
const JWT_HEADER = `{"alg":"RS256","typ":"JWT"}`;

/**
 * The assertion's lifetime in seconds. GCP caps it at one
 * hour and rejects anything longer.
 */
const ASSERTION_LIFETIME_SECONDS = 3600;

/**
 * Builds the assertion's claim set from an explicit issue
 * time (seconds since the epoch).
 *
 * The instant is a parameter rather than a clock read here,
 * so building an assertion is a pure function of its inputs
 * — which is what lets a test pin the exact second and
 * compare a whole signing input against an expected string.
 * `sub` is present only under domain-wide delegation, and
 * `exactOptionalPropertyTypes` means it must be omitted
 * rather than set to `undefined`.
 */
export const gcpJwtClaims = (
  account: GcpServiceAccount,
  request: GcpTokenRequest,
  issuedAtSeconds: number,
): GcpJwtClaims => ({
  iss: account.clientEmail,
  scope: request.scope,
  aud: GCP_TOKEN_ENDPOINT,
  exp:
    issuedAtSeconds + ASSERTION_LIFETIME_SECONDS,
  iat: issuedAtSeconds,
  ...pipe(
    request.subject,
    matchOption(
      (): Partial<
        Pick<GcpJwtClaims, "sub">
      > => ({}),
      (
        subject: SoftStr,
      ): Partial<Pick<GcpJwtClaims, "sub">> => ({
        sub: subject,
      }),
    ),
  ),
});

/**
 * Renders the claim set as the exact JSON bytes that get
 * signed.
 *
 * Written explicitly rather than through `encodeJson` for
 * two reasons. A JWT signature covers *bytes*, so the key
 * order must be pinned by the code rather than left to an
 * object's insertion order. And this is total — every field
 * is a string or a number, and `JSON.stringify` of a string
 * cannot fail — whereas `encodeJson` returns a `Result`
 * whose error arm nothing could ever reach for this shape,
 * which would be an unreachable branch threaded through the
 * whole signing path. Each value still goes through
 * `JSON.stringify`, so an email or scope containing a quote
 * is escaped rather than breaking out.
 */
export const gcpClaimsJson = (
  claims: GcpJwtClaims,
): SoftStr =>
  `{${[
    `"iss":${JSON.stringify(claims.iss)}`,
    `"scope":${JSON.stringify(claims.scope)}`,
    `"aud":${JSON.stringify(claims.aud)}`,
    ...(claims.sub === undefined
      ? []
      : [`"sub":${JSON.stringify(claims.sub)}`]),
    `"exp":${claims.exp}`,
    `"iat":${claims.iat}`,
  ].join(",")}}`;

/**
 * The JWT signing input: `base64url(header).base64url(claims)`.
 * Pure and total, so it is directly comparable against an
 * expected string in a test.
 */
export const gcpSigningInput = (
  claims: GcpJwtClaims,
): SoftStr =>
  `${textToBase64Url(JWT_HEADER)}.${textToBase64Url(
    gcpClaimsJson(claims),
  )}`;

/**
 * Signs the assertion: the signing input, a `.`, and the
 * base64url RS256 signature over it.
 *
 * Lifted through one `tryCatch`, so a malformed PEM — the
 * realistic Web Crypto failure here — folds to a
 * {@link Defect} rather than escaping as a throw.
 */
export const gcpAssertion = tryCatch(
  (input: {
    account: GcpServiceAccount;
    claims: GcpJwtClaims;
  }): Promise<SoftStr> =>
    pipe(
      gcpSigningInput(input.claims),
      (signingInput: SoftStr) =>
        rs256Sign(
          input.account.privateKeyPem,
          signingInput,
        ).then(
          (signature: Uint8Array): SoftStr =>
            `${signingInput}.${toBase64Url(signature)}`,
        ),
    ),
);

/**
 * The token endpoint's success body, at the boundary. A
 * response that does not carry all three fields is an
 * {@link InvalidError}, not a token — GCP returns its
 * failures as a 4xx with a differently-shaped JSON body,
 * and a non-2xx is a perfectly valid `HttpResponse` to this
 * transport, so the shape check is what separates them.
 */
const asAccessToken = (
  value: unknown,
): Result<GcpAccessToken, InvalidError> =>
  pipe(
    cast(
      value,
      asObj,
      forProp("access_token", asSoftStr),
      forProp("expires_in", asNum),
      forProp("token_type", asSoftStr),
    ),
    // The wire names are snake_case and the domain's are
    // camelCase, so the cast result is RENAMED into the
    // domain shape. A structural coercion here would be an
    // `as`, and the whole point of the boundary is that the
    // rename is visible.
    mapResult(
      (raw: {
        access_token: SoftStr;
        expires_in: number;
        token_type: SoftStr;
      }): GcpAccessToken => ({
        accessToken: raw.access_token,
        expiresIn: raw.expires_in,
        tokenType: raw.token_type,
      }),
    ),
  );

/**
 * The `application/x-www-form-urlencoded` body of the token
 * request, per RFC 7523.
 */
const exchangeBody = (
  assertion: SoftStr,
): SoftStr =>
  [
    `grant_type=${encodeURIComponent(JWT_BEARER_GRANT_TYPE)}`,
    `assertion=${encodeURIComponent(assertion)}`,
  ].join("&");

/**
 * Exchanges a signed assertion for an access token through
 * this package's own transport — `post` plus
 * `decodeJsonBody`, never a raw `fetch`.
 */
export const gcpExchangeAssertion = (
  assertion: SoftStr,
): PromisedResult<GcpAccessToken, Defect> =>
  post(GCP_TOKEN_ENDPOINT, {
    headers: {
      "content-type":
        "application/x-www-form-urlencoded",
    },
    body: exchangeBody(assertion),
  }).then(
    matchResult(
      (
        e: unknown,
      ): Result<GcpAccessToken, Defect> =>
        err(
          defect(
            "GCP token exchange failed at the transport",
            e,
          ),
        ),
      (
        response: HttpResponse,
      ): Result<GcpAccessToken, Defect> =>
        pipe(
          response,
          decodeJsonBody(asAccessToken),
          matchResult(
            (
              e: InvalidError,
            ): Result<GcpAccessToken, Defect> =>
              err(
                defect(
                  `GCP token endpoint returned status ${response.status.content} with an unexpected body: ${e.content.message}`,
                ),
              ),
            (
              token: GcpAccessToken,
            ): Result<GcpAccessToken, Defect> =>
              ok(token),
          ),
        ),
    ),
  );

/**
 * Obtains a GCP access token for a service account: build
 * the claims, sign the assertion with RS256, and exchange
 * it at the token endpoint.
 *
 * `issuedAtSeconds` is supplied by the caller rather than
 * read from a clock here, keeping every step below the
 * transport a pure function of its inputs.
 */
export const gcpAccessToken = (
  account: GcpServiceAccount,
  request: GcpTokenRequest,
  issuedAtSeconds: number,
): PromisedResult<GcpAccessToken, Defect> =>
  gcpAssertion({
    account,
    claims: gcpJwtClaims(
      account,
      request,
      issuedAtSeconds,
    ),
  }).then(
    matchResult(
      (
        e: Defect,
      ): PromisedResult<GcpAccessToken, Defect> =>
        Promise.resolve(err(e)),
      (
        assertion: SoftStr,
      ): PromisedResult<GcpAccessToken, Defect> =>
        gcpExchangeAssertion(assertion),
    ),
  );

/**
 * The `Authorization: Bearer <token>` dict for an obtained
 * access token — the point of the whole exchange.
 */
export const gcpBearerAuth = (
  token: GcpAccessToken,
): Record<string, SoftStr> => ({
  authorization: `Bearer ${token.accessToken}`,
});
