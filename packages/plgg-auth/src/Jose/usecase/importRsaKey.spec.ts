import {
  test,
  check,
  toBe,
  okThen,
} from "plgg-test";
import {
  importVerifyKey,
  importSignKey,
} from "plgg-auth/index";
import {
  a2PublicKey,
  a2PrivateKey,
  b64,
} from "plgg-auth/Jose/testkit/fixtures";

test("importVerifyKey imports a public JWK", async () =>
  check(
    await importVerifyKey(a2PublicKey),
    okThen((key: CryptoKey) =>
      toBe("public")(key.type),
    ),
  ));

test("importSignKey imports a private JWK", async () =>
  check(
    await importSignKey(a2PrivateKey),
    okThen((key: CryptoKey) =>
      toBe("private")(key.type),
    ),
  ));

test("import is lazy on Node: malformed material only fails at use", async () =>
  // Node's WebCrypto defers RSA key validation
  // to the sign/verify call (see the SignFailure
  // and VerifyFailure specs), so import itself
  // succeeds. KeyFailure remains the fold for
  // runtimes that validate eagerly.
  check(
    await importVerifyKey({
      ...a2PublicKey,
      n: b64("AA"),
    }),
    okThen((key: CryptoKey) =>
      toBe("public")(key.type),
    ),
  ));
