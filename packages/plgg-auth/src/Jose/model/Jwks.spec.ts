import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { isSome, isNone } from "plgg";
import {
  RsaPublicJwk,
  asRsaPublicJwk,
  jwks,
  findJwk,
  jwksJson,
} from "plgg-auth/index";
import { rfc7638Example } from "plgg-auth/Jose/testkit/rfcVectors";

const key = (): RsaPublicJwk | null => {
  const parsed = asRsaPublicJwk({
    kty: "RSA",
    n: rfc7638Example.n,
    e: rfc7638Example.e,
    kid: rfc7638Example.kid,
  });
  return parsed.__tag === "Ok"
    ? parsed.content
    : null;
};

test("findJwk resolves a key by kid", () => {
  const k = key();
  return check(
    k !== null &&
      isSome(
        findJwk(rfc7638Example.kid)(jwks([k])),
      ),
    toBe(true),
  );
});

test("findJwk is None for an unknown kid", () => {
  const k = key();
  return check(
    k !== null &&
      isNone(findJwk("other-kid")(jwks([k]))),
    toBe(true),
  );
});

test("jwksJson serves public members with fixed alg and use", () => {
  const k = key();
  return check(
    k === null ? {} : jwksJson(jwks([k])),
    toEqual({
      keys: [
        {
          kty: "RSA",
          n: rfc7638Example.n,
          e: rfc7638Example.e,
          kid: rfc7638Example.kid,
          alg: "RS256",
          use: "sig",
        },
      ],
    }),
  );
});

test("jwksJson of an empty set is an empty keys array", () =>
  all([
    check(
      jwksJson(jwks([])),
      toEqual({ keys: [] }),
    ),
  ]));
