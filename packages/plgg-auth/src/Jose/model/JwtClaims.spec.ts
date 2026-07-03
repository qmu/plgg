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
  some,
  isNone,
  isSome,
  decodeJson,
} from "plgg";
import {
  asJwtClaims,
  claimsJson,
  decodeClaimsJson,
  joseErrorKind,
} from "plgg-auth/index";
import {
  str,
  claimsFixture,
} from "plgg-auth/Jose/testkit/fixtures";

test("asJwtClaims normalizes a bare-string aud to an array", () =>
  check(
    asJwtClaims({
      iss: "https://op.example",
      sub: "s1",
      aud: "client-1",
      exp: 2,
      iat: 1,
    }),
    okThen((claims) =>
      all([
        check(
          claims.aud.map((a) => a.content),
          toEqual(["client-1"]),
        ),
        check(isNone(claims.nbf), toBe(true)),
        check(isNone(claims.nonce), toBe(true)),
      ]),
    ),
  ));

test("asJwtClaims keeps an array aud and optional claims", () =>
  check(
    asJwtClaims({
      iss: "i",
      sub: "s",
      aud: ["a", "b"],
      exp: 2,
      iat: 1,
      nbf: 1,
      nonce: "n-1",
    }),
    okThen((claims) =>
      all([
        check(
          claims.aud.map((a) => a.content),
          toEqual(["a", "b"]),
        ),
        check(isSome(claims.nbf), toBe(true)),
        check(isSome(claims.nonce), toBe(true)),
      ]),
    ),
  ));

test("asJwtClaims rejects a missing iss", () =>
  check(
    asJwtClaims({
      sub: "s",
      aud: "a",
      exp: 2,
      iat: 1,
    }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("asJwtClaims rejects a non-string aud entry", () =>
  check(
    asJwtClaims({
      iss: "i",
      sub: "s",
      aud: ["a", 5],
      exp: 2,
      iat: 1,
    }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("claimsJson writes a single aud as a bare string and omits None", () =>
  check(
    decodeJson(claimsJson(claimsFixture({}))),
    okThen((v: unknown) =>
      toEqual({
        iss: "https://op.example",
        sub: "subject-1",
        aud: "client-1",
        exp: 1300819380 + 600,
        iat: 1300819380,
      })(v),
    ),
  ));

test("claimsJson writes a multi aud as an array and Some fields", () =>
  check(
    decodeJson(
      claimsJson(
        claimsFixture({
          aud: [str("a"), str("b")],
          nbf: some(1300819000),
          nonce: some(str("n-1")),
        }),
      ),
    ),
    okThen((v: unknown) =>
      toEqual({
        iss: "https://op.example",
        sub: "subject-1",
        aud: ["a", "b"],
        exp: 1300819380 + 600,
        iat: 1300819380,
        nbf: 1300819000,
        nonce: "n-1",
      })(v),
    ),
  ));

test("decodeClaimsJson roundtrips claimsJson", () =>
  check(
    decodeClaimsJson(
      claimsJson(claimsFixture({})),
    ),
    okThen((claims) =>
      check(
        claims.iss.content,
        toBe("https://op.example"),
      ),
    ),
  ));

test("decodeClaimsJson fails on malformed JSON", () =>
  check(
    decodeClaimsJson("{nope"),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("DecodeFailure"),
      ),
    ),
  ));
