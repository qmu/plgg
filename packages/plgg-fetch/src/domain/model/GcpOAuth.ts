import { SoftStr, Option } from "plgg";

/**
 * The half of a GCP service-account key file this exchange
 * needs: the account's own address (`client_email`) and its
 * PKCS#8 PEM private key (`private_key`), named as they are
 * in the downloaded JSON so a caller can see the mapping.
 *
 * The key is passed as the PEM text rather than a parsed
 * handle: parsing is Web Crypto's job and belongs at the
 * vendor seam, and a `CryptoKey` in a domain type would put
 * a platform type in the model.
 */
export type GcpServiceAccount = Readonly<{
  clientEmail: SoftStr;
  privateKeyPem: SoftStr;
}>;

/**
 * What the assertion asks for: the space-separated OAuth
 * scopes, and optionally the user to impersonate under
 * domain-wide delegation (`sub`). Absent `subject` is the
 * ordinary case — the service account acts as itself — so
 * it is an {@link Option}, never a nullable field.
 */
export type GcpTokenRequest = Readonly<{
  scope: SoftStr;
  subject: Option<SoftStr>;
}>;

/**
 * Google's OAuth 2.0 token endpoint. Both the `aud` claim
 * inside the assertion and the URL the assertion is POSTed
 * to — they must agree, which is why it is one constant
 * rather than two arguments.
 */
export const GCP_TOKEN_ENDPOINT =
  "https://oauth2.googleapis.com/token";

/**
 * The JWT-bearer grant type, spelled by RFC 7523.
 */
export const JWT_BEARER_GRANT_TYPE =
  "urn:ietf:params:oauth:grant-type:jwt-bearer";

/**
 * The claim set of the assertion, exactly as GCP documents
 * it. `iat`/`exp` are seconds since the epoch, and GCP caps
 * the lifetime at one hour.
 *
 * Modelled as data, and built from an explicit instant
 * rather than a clock read inside the builder, so assembling
 * an assertion is a pure function of its inputs and a test
 * can pin the exact second.
 */
export type GcpJwtClaims = Readonly<{
  iss: SoftStr;
  scope: SoftStr;
  aud: SoftStr;
  exp: number;
  iat: number;
  sub?: SoftStr;
}>;

/**
 * What the token endpoint returns on success. `expiresIn`
 * is seconds of remaining life, which a caller needs in
 * order to know when to exchange again — a token is not
 * useful without it.
 */
export type GcpAccessToken = Readonly<{
  accessToken: SoftStr;
  expiresIn: number;
  tokenType: SoftStr;
}>;
