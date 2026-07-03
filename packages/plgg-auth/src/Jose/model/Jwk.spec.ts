import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import {
  asRsaPublicJwk,
  asRsaPrivateJwk,
  asKid,
  isKid,
  kidString,
  publicJwkJson,
  privateJwkJson,
} from "plgg-auth/index";
import {
  rfc7515A2,
  rfc7638Example,
} from "plgg-auth/Jose/testkit/rfcVectors";

test("asRsaPublicJwk accepts a JWKS-shaped object", () =>
  check(
    asRsaPublicJwk({
      kty: "RSA",
      n: rfc7638Example.n,
      e: rfc7638Example.e,
      kid: rfc7638Example.kid,
    }),
    okThen((key) =>
      all([
        check(key.kty, toBe("RSA")),
        check(
          kidString(key.kid),
          toBe(rfc7638Example.kid),
        ),
      ]),
    ),
  ));

test("asRsaPublicJwk rejects a kid-less JWK", () =>
  check(
    asRsaPublicJwk({
      kty: "RSA",
      n: rfc7638Example.n,
      e: rfc7638Example.e,
    }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("asRsaPublicJwk rejects a non-RSA kty", () =>
  check(
    asRsaPublicJwk({
      kty: "EC",
      n: rfc7638Example.n,
      e: rfc7638Example.e,
      kid: "x",
    }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("asKid rejects the empty string", () =>
  check(
    asKid(""),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("asRsaPrivateJwk parses the RFC 7515 A.2 key (kid injected)", () =>
  check(
    asRsaPrivateJwk({
      kty: "RSA",
      kid: "a2",
      n: rfc7515A2.n,
      e: rfc7515A2.e,
      d: rfc7515A2.d,
      p: rfc7515A2.p,
      q: rfc7515A2.q,
      dp: rfc7515A2.dp,
      dq: rfc7515A2.dq,
      qi: rfc7515A2.qi,
    }),
    okThen((key) =>
      all([
        check(isKid(key.kid), toBe(true)),
        check(
          privateJwkJson(key),
          toEqual({
            kty: "RSA",
            n: rfc7515A2.n,
            e: rfc7515A2.e,
            d: rfc7515A2.d,
            p: rfc7515A2.p,
            q: rfc7515A2.q,
            dp: rfc7515A2.dp,
            dq: rfc7515A2.dq,
            qi: rfc7515A2.qi,
          }),
        ),
        check(
          publicJwkJson(key),
          toEqual({
            kty: "RSA",
            n: rfc7515A2.n,
            e: rfc7515A2.e,
          }),
        ),
      ]),
    ),
  ));

test("asRsaPrivateJwk rejects a public-only JWK", () =>
  check(
    asRsaPrivateJwk({
      kty: "RSA",
      kid: "a2",
      n: rfc7515A2.n,
      e: rfc7515A2.e,
    }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));
