import {
  Option,
  SoftStr,
  fromNullable,
} from "plgg";
import {
  RsaPublicJwk,
  kidString,
  publicJwkJson,
} from "plgg-auth/Jose/model/Jwk";

/**
 * A JWK Set (RFC 7517 §5): the public keys a
 * verifier resolves a JWS header's `kid` against.
 */
export type Jwks = Readonly<{
  keys: ReadonlyArray<RsaPublicJwk>;
}>;

/** Constructs a {@link Jwks}. */
export const jwks = (
  keys: ReadonlyArray<RsaPublicJwk>,
): Jwks => ({ keys });

/**
 * Looks a key up by its `kid`. Takes the bare
 * string (a JWS header field), returns `None`
 * when no key matches.
 */
export const findJwk =
  (kid: SoftStr) =>
  (set: Jwks): Option<RsaPublicJwk> =>
    fromNullable(
      set.keys.find(
        (k) => kidString(k.kid) === kid,
      ),
    );

/**
 * The plain JSON shape of the set for serving as
 * a JWKS document (`/jwks.json`). Public members
 * only, annotated with the fixed `alg`/`use` this
 * library issues under.
 */
export const jwksJson = (
  set: Jwks,
): {
  keys: ReadonlyArray<{
    kty: string;
    n: string;
    e: string;
    kid: string;
    alg: string;
    use: string;
  }>;
} => ({
  keys: set.keys.map((k) => ({
    ...publicJwkJson(k),
    kid: kidString(k.kid),
    alg: "RS256",
    use: "sig",
  })),
});
