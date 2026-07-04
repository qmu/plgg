import {
  test,
  check,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import {
  verify as nodeVerify,
  sign as nodeSign,
  createPublicKey,
  createPrivateKey,
} from "node:crypto";
import { isOk } from "plgg";
import {
  signJws,
  signWith,
  importVerifyKey,
  verifyJwsWith,
  parseCompactJws,
  compactJwsString,
  decodeBase64Url,
  encodeBase64Url,
  base64UrlString,
  utf8Bytes,
  toBufferSource,
  publicJwkJson,
  privateJwkJson,
  signingInput,
  joseErrorKind,
} from "plgg-auth/index";
import {
  a2PrivateKey,
  a2PublicKey,
  compactOf,
  b64OfJson,
} from "plgg-auth/Jose/testkit/fixtures";

test("signJws output verifies with verifyJwsWith (roundtrip)", async () => {
  const signed = await signJws(a2PrivateKey)(
    '{"hello":"world"}',
  );
  if (!isOk(signed)) {
    return check(isOk(signed), toBe(true));
  }
  return check(
    await verifyJwsWith(a2PublicKey)(
      signed.content,
    ),
    okThen((payload) =>
      toBe('{"hello":"world"}')(payload),
    ),
  );
});

test("signing with a verify-only key folds to SignFailure", async () => {
  // A key imported with only the "verify" usage
  // makes crypto.subtle.sign throw InvalidAccessError
  // on every runtime (the usage is checked before
  // any key-material math), so the SignFailure arm
  // is exercised deterministically — unlike a
  // degenerate key, which some OpenSSL builds sign
  // successfully.
  const verifyKey =
    await importVerifyKey(a2PublicKey);
  if (!isOk(verifyKey)) {
    return check(isOk(verifyKey), toBe(true));
  }
  return check(
    await signWith(verifyKey.content)(
      "header.payload",
    ),
    errThen((e) =>
      check(
        joseErrorKind(e),
        toBe("SignFailure"),
      ),
    ),
  );
});

test("signJws is deterministic (RSASSA-PKCS1-v1_5)", async () => {
  const first =
    await signJws(a2PrivateKey)("payload");
  return check(
    await signJws(a2PrivateKey)("payload"),
    okThen((jws) =>
      check(
        first.__tag === "Ok" &&
          compactJwsString(first.content) ===
            compactJwsString(jws),
        toBe(true),
      ),
    ),
  );
});

test("cross-check: node:crypto verifies a signJws signature", async () =>
  check(
    await signJws(a2PrivateKey)("cross-check"),
    okThen((jws) =>
      check(
        parseCompactJws(jws),
        okThen((parts) =>
          check(
            decodeBase64Url(parts.signature),
            okThen((sig) =>
              toBe(true)(
                nodeVerify(
                  "sha256",
                  toBufferSource(
                    utf8Bytes(
                      signingInput(
                        parts.header,
                        parts.payload,
                      ),
                    ),
                  ),
                  createPublicKey({
                    key: publicJwkJson(
                      a2PublicKey,
                    ),
                    format: "jwk",
                  }),
                  toBufferSource(sig),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  ));

test("cross-check: verifyJwsWith accepts a node:crypto signature", async () => {
  const headerB64 = b64OfJson({
    alg: "RS256",
    kid: "a2",
  });
  const payloadB64 = base64UrlString(
    encodeBase64Url(utf8Bytes('{"from":"node"}')),
  );
  const input = `${headerB64}.${payloadB64}`;
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
        payloadB64,
        base64UrlString(
          encodeBase64Url(
            new Uint8Array(signature),
          ),
        ),
      ),
    ),
    okThen((payload) =>
      toBe('{"from":"node"}')(payload),
    ),
  );
});
