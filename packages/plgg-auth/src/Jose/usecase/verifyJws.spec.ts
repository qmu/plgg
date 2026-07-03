import {
  test,
  check,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { isOk, box } from "plgg";
import {
  sign as nodeSign,
  createPrivateKey,
} from "node:crypto";
import {
  verifyJws,
  verifyJwsWith,
  signJws,
  jwks,
  joseErrorKind,
  privateJwkJson,
  utf8Bytes,
  toBufferSource,
  encodeBase64Url,
  base64UrlString,
} from "plgg-auth/index";
import { rfc7515A2 } from "plgg-auth/Jose/testkit/rfcVectors";
import {
  a2PrivateKey,
  a2PublicKey,
  a2Jwks,
  a2Compact,
  compactOf,
  b64OfJson,
  b64,
} from "plgg-auth/Jose/testkit/fixtures";

test("the RFC 7515 A.2 vector verifies against its key", async () =>
  check(
    await verifyJwsWith(a2PublicKey)(a2Compact()),
    okThen((payload) =>
      toBe(rfc7515A2.payloadText)(payload),
    ),
  ));

test("a tampered payload fails with VerifyFailure", async () =>
  check(
    await verifyJwsWith(a2PublicKey)(
      compactOf(
        rfc7515A2.headerB64,
        `X${rfc7515A2.payloadB64.slice(1)}`,
        rfc7515A2.sigB64,
      ),
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("VerifyFailure"),
      ),
    ),
  ));

test("a tampered signature fails with VerifyFailure", async () =>
  check(
    await verifyJwsWith(a2PublicKey)(
      compactOf(
        rfc7515A2.headerB64,
        rfc7515A2.payloadB64,
        `${rfc7515A2.sigB64.slice(0, -2)}AA`,
      ),
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("VerifyFailure"),
      ),
    ),
  ));

test('alg "none" is rejected before any crypto', async () =>
  check(
    await verifyJwsWith(a2PublicKey)(
      compactOf(
        b64OfJson({ alg: "none" }),
        rfc7515A2.payloadB64,
        "AA",
      ),
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("AlgMismatch"),
      ),
    ),
  ));

test("a downgraded HS256 header is rejected", async () =>
  check(
    await verifyJwsWith(a2PublicKey)(
      compactOf(
        b64OfJson({ alg: "HS256", kid: "a2" }),
        rfc7515A2.payloadB64,
        "AA",
      ),
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("AlgMismatch"),
      ),
    ),
  ));

test("malformed key material fails verification, not Ok", async () =>
  // Node's WebCrypto imports lazily and folds a
  // bad key into a false verification, so the
  // failure surfaces as VerifyFailure here (a
  // strictly-validating runtime would surface
  // KeyFailure at import instead).
  check(
    await verifyJwsWith({
      ...a2PublicKey,
      n: b64("AA"),
    })(a2Compact()),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("VerifyFailure"),
      ),
    ),
  ));

test("verifyJws resolves the signer through the JWKS by kid", async () => {
  const signed =
    await signJws(a2PrivateKey)("via-jwks");
  if (!isOk(signed)) {
    return check(isOk(signed), toBe(true));
  }
  return check(
    await verifyJws(a2Jwks())(signed.content),
    okThen((payload) =>
      toBe("via-jwks")(payload),
    ),
  );
});

test("verifyJws fails with UnknownKid when no key matches", async () => {
  const signed =
    await signJws(a2PrivateKey)("via-jwks");
  if (!isOk(signed)) {
    return check(isOk(signed), toBe(true));
  }
  return check(
    await verifyJws(jwks([]))(signed.content),
    errThen((e) =>
      check(joseErrorKind(e), toBe("UnknownKid")),
    ),
  );
});

test("verifyJws fails with UnknownKid on a kid-less header", async () =>
  check(
    await verifyJws(a2Jwks())(a2Compact()),
    errThen((e) =>
      check(joseErrorKind(e), toBe("UnknownKid")),
    ),
  ));

test("a corrupted header fails with DecodeFailure", async () =>
  check(
    await verifyJws(a2Jwks())(
      compactOf(
        "notjson",
        rfc7515A2.payloadB64,
        "AA",
      ),
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("DecodeFailure"),
      ),
    ),
  ));

test("verifyJwsWith rejects a corrupted header too", async () =>
  check(
    await verifyJwsWith(a2PublicKey)(
      compactOf(
        "notjson",
        rfc7515A2.payloadB64,
        "AA",
      ),
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("DecodeFailure"),
      ),
    ),
  ));

test("verifyJwsWith guards a box built outside the caster", async () =>
  check(
    await verifyJwsWith(a2PublicKey)(
      box("CompactJws")("bad"),
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("DecodeFailure"),
      ),
    ),
  ));

test("an impossible-length signature segment fails to decode", async () =>
  check(
    await verifyJwsWith(a2PublicKey)(
      compactOf(
        rfc7515A2.headerB64,
        rfc7515A2.payloadB64,
        "a",
      ),
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("DecodeFailure"),
      ),
    ),
  ));

test("a validly signed but undecodable payload fails after verification", async () => {
  // Sign an impossible-length payload segment
  // with node:crypto so the signature check
  // passes and the payload decode is what
  // fails.
  const headerB64 = b64OfJson({
    alg: "RS256",
    kid: "a2",
  });
  const input = `${headerB64}.a`;
  const signature = nodeSign(
    "sha256",
    toBufferSource(utf8Bytes(input)),
    createPrivateKey({
      key: privateJwkJson(a2PrivateKey),
      format: "jwk",
    }),
  );
  return check(
    await verifyJwsWith(a2PublicKey)(
      compactOf(
        headerB64,
        "a",
        base64UrlString(
          encodeBase64Url(
            new Uint8Array(signature),
          ),
        ),
      ),
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("DecodeFailure"),
      ),
    ),
  );
});
