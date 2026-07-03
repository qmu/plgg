import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { isOk } from "plgg";
import {
  asCodeVerifier,
  asCodeChallenge,
  computeS256Challenge,
  pkceMatches,
  codeChallengeString,
} from "plgg-auth/index";

test("asCodeVerifier enforces the 43-128 unreserved grammar", () =>
  all([
    check(
      asCodeVerifier("a".repeat(43)),
      okThen((v) =>
        check(typeof v.content, toBe("string")),
      ),
    ),
    check(
      asCodeVerifier("a".repeat(42)),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asCodeVerifier("a".repeat(129)),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asCodeVerifier(
        "spaces are illegal ".repeat(3),
      ),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("asCodeChallenge requires a 43-char base64url digest", () =>
  all([
    check(
      asCodeChallenge("a".repeat(43)),
      okThen((c) =>
        toBe(43)(codeChallengeString(c).length),
      ),
    ),
    check(
      asCodeChallenge("too-short"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("computeS256Challenge matches the RFC 7636 appendix B vector", async () => {
  // RFC 7636 Appendix B: verifier
  // "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
  // -> challenge
  // "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
  const verifier = asCodeVerifier(
    "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  );
  if (!isOk(verifier)) {
    return check(isOk(verifier), toBe(true));
  }
  return check(
    await computeS256Challenge(verifier.content),
    okThen((c) =>
      toBe(
        "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      )(codeChallengeString(c)),
    ),
  );
});

test("pkceMatches compares challenges by value", () => {
  const a = asCodeChallenge("a".repeat(43));
  const b = asCodeChallenge("b".repeat(43));
  if (!isOk(a) || !isOk(b)) {
    return check(isOk(a) && isOk(b), toBe(true));
  }
  return all([
    check(
      pkceMatches(a.content, a.content),
      toBe(true),
    ),
    check(
      pkceMatches(a.content, b.content),
      toBe(false),
    ),
  ]);
});
