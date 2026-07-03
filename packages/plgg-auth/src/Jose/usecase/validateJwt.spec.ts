import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { some, none, box, isOk } from "plgg";
import {
  encodeJwt,
  validateJwt,
  checkClaims,
  compactJwsString,
  joseErrorKind,
} from "plgg-auth/index";
import {
  a2PrivateKey,
  claimsFixture,
  validateConfig,
  clockAt,
  str,
} from "plgg-auth/Jose/testkit/fixtures";

test("a signed token validates end to end", async () => {
  const signed = await encodeJwt(a2PrivateKey)(
    claimsFixture({
      nonce: some(str("n-1")),
    }),
  );
  if (!isOk(signed)) {
    return check(isOk(signed), toBe(true));
  }
  return check(
    await validateJwt(
      validateConfig({
        nonce: some(str("n-1")),
      }),
    )(signed.content),
    okThen((claims) =>
      all([
        check(
          claims.sub.content,
          toBe("subject-1"),
        ),
        check(
          claims.aud.map((a) => a.content),
          toEqual(["client-1"]),
        ),
      ]),
    ),
  );
});

test("a tampered token fails signature validation", async () => {
  const signed = await encodeJwt(a2PrivateKey)(
    claimsFixture({}),
  );
  if (!isOk(signed)) {
    return check(isOk(signed), toBe(true));
  }
  return check(
    await validateJwt(validateConfig({}))(
      box("CompactJws")(
        `${compactJwsString(signed.content).slice(
          0,
          -2,
        )}AA`,
      ),
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("VerifyFailure"),
      ),
    ),
  );
});

test("checkClaims rejects a wrong issuer", () =>
  check(
    checkClaims(
      validateConfig({
        issuer: str("https://other.example"),
      }),
    )(claimsFixture({})),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("IssuerMismatch"),
      ),
    ),
  ));

test("checkClaims rejects an unmatched audience", () =>
  check(
    checkClaims(
      validateConfig({
        audience: str("client-2"),
      }),
    )(claimsFixture({})),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("AudienceMismatch"),
      ),
    ),
  ));

test("checkClaims accepts the audience anywhere in a multi aud", () =>
  check(
    checkClaims(validateConfig({}))(
      claimsFixture({
        aud: [str("other"), str("client-1")],
      }),
    ),
    okThen((claims) =>
      toBe(2)(claims.aud.length),
    ),
  ));

test("checkClaims rejects exactly at exp (on-or-after rule)", () =>
  check(
    checkClaims(
      validateConfig({ clock: clockAt(600) }),
    )(claimsFixture({})),
    errThen((e) =>
      check(joseErrorKind(e), toBe("Expired")),
    ),
  ));

test("leeway rescues a just-expired token", () =>
  check(
    checkClaims(
      validateConfig({
        clock: clockAt(605),
        leewaySeconds: 10,
      }),
    )(claimsFixture({})),
    okThen((claims) =>
      toBe("subject-1")(claims.sub.content),
    ),
  ));

test("checkClaims rejects a future nbf", () =>
  check(
    checkClaims(validateConfig({}))(
      claimsFixture({
        nbf: some(1300819380 + 120),
      }),
    ),
    errThen((e) =>
      check(joseErrorKind(e), toBe("Premature")),
    ),
  ));

test("leeway rescues a not-quite-valid nbf", () =>
  check(
    checkClaims(
      validateConfig({ leewaySeconds: 120 }),
    )(
      claimsFixture({
        nbf: some(1300819380 + 120),
      }),
    ),
    okThen((claims) =>
      toBe("subject-1")(claims.sub.content),
    ),
  ));

test("an expected nonce must be present", () =>
  check(
    checkClaims(
      validateConfig({
        nonce: some(str("n-1")),
      }),
    )(claimsFixture({})),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("NonceMismatch"),
      ),
    ),
  ));

test("an expected nonce must match", () =>
  check(
    checkClaims(
      validateConfig({
        nonce: some(str("n-1")),
      }),
    )(
      claimsFixture({
        nonce: some(str("n-2")),
      }),
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("NonceMismatch"),
      ),
    ),
  ));

test("an unexpected token nonce is tolerated", () =>
  check(
    checkClaims(
      validateConfig({ nonce: none() }),
    )(
      claimsFixture({
        nonce: some(str("n-1")),
      }),
    ),
    okThen((claims) =>
      toBe("subject-1")(claims.sub.content),
    ),
  ));
