import { Num } from "plgg";
import { RsaPrivateJwk } from "plgg-auth/Jose/model/Jwk";

/**
 * The lifecycle status of a signing key:
 * - `active`   — new tokens are signed with it;
 * - `retiring` — no longer signs, but still
 *   served in the JWKS so tokens signed before
 *   rotation keep validating;
 * - `retired`  — past its window, dropped from
 *   the JWKS.
 */
export type KeyStatus =
  | "active"
  | "retiring"
  | "retired";

/**
 * A stored signing key and its lifecycle state.
 * The private JWK is kept whole; encrypting it at
 * rest is an operator decision documented at the
 * store boundary (a KMS-wrapped column, an
 * env-provided key) — the model carries the
 * plaintext JWK and the driver decides how to
 * persist it.
 */
export type SigningKeyRecord = Readonly<{
  privateKey: RsaPrivateJwk;
  status: KeyStatus;
  createdAt: Num;
}>;
