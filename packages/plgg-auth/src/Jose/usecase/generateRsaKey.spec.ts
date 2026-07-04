import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { isOk } from "plgg";
import {
  generateRsaKey,
  thumbprintKid,
  kidString,
  base64UrlString,
} from "plgg-auth/index";

test("generateRsaKey yields a 2048-bit pair named by its thumbprint", async () => {
  const pair = await generateRsaKey();
  if (!isOk(pair)) {
    return check(isOk(pair), toBe(true));
  }
  const { publicKey, privateKey } = pair.content;
  const kid = await thumbprintKid(publicKey);
  return all([
    // Both halves share one kid.
    check(
      kidString(publicKey.kid),
      toBe(kidString(privateKey.kid)),
    ),
    // 2048-bit modulus = 256 bytes = 342
    // base64url chars.
    check(
      base64UrlString(publicKey.n).length,
      toBe(342),
    ),
    check(
      base64UrlString(publicKey.e),
      toBe("AQAB"),
    ),
    // The kid IS the RFC 7638 thumbprint.
    check(
      kid,
      okThen((k) =>
        toBe(kidString(publicKey.kid))(
          kidString(k),
        ),
      ),
    ),
  ]);
});
