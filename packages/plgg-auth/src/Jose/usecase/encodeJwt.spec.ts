import {
  test,
  check,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { some, box, decodeJson } from "plgg";
import {
  encodeJwt,
  decodeJwt,
  parseCompactJws,
  compactJwsString,
  decodeBase64Url,
  utf8String,
  joseErrorKind,
} from "plgg-auth/index";
import {
  a2PrivateKey,
  claimsFixture,
  str,
} from "plgg-auth/Jose/testkit/fixtures";

test("encodeJwt roundtrips through decodeJwt", async () =>
  check(
    await encodeJwt(a2PrivateKey)(
      claimsFixture({
        nonce: some(str("n-1")),
      }),
    ),
    okThen((jws) =>
      check(
        decodeJwt(jws),
        okThen((claims) =>
          toBe("https://op.example")(
            claims.iss.content,
          ),
        ),
      ),
    ),
  ));

test("encodeJwt puts a single aud on the wire as a bare string", async () =>
  check(
    await encodeJwt(a2PrivateKey)(
      claimsFixture({}),
    ),
    okThen((jws) =>
      check(
        parseCompactJws(jws),
        okThen((parts) =>
          check(
            decodeBase64Url(parts.payload),
            okThen((bytes) =>
              check(
                utf8String(bytes),
                okThen((json) =>
                  check(
                    decodeJson(json),
                    okThen((v: unknown) =>
                      toEqual({
                        iss: "https://op.example",
                        sub: "subject-1",
                        aud: "client-1",
                        exp: 1300819980,
                        iat: 1300819380,
                      })(v),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  ));

test("decodeJwt reads claims without verifying the signature", async () =>
  check(
    await encodeJwt(a2PrivateKey)(
      claimsFixture({}),
    ),
    okThen((jws) =>
      check(
        // Corrupt the signature; decodeJwt must
        // still read the (unverified) claims.
        decodeJwt(
          box("CompactJws")(
            `${compactJwsString(jws).slice(0, -2)}AA`,
          ),
        ),
        okThen((claims) =>
          toBe("subject-1")(claims.sub.content),
        ),
      ),
    ),
  ));

test("decodeJwt fails with DecodeFailure on a non-JSON payload", () =>
  check(
    decodeJwt(box("CompactJws")("aa.bb.cc")),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("DecodeFailure"),
      ),
    ),
  ));
