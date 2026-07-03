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
  asRefreshToken,
  asRefreshTokenHash,
  asFamilyId,
  isRefreshToken,
  isRefreshTokenHash,
  isFamilyId,
  refreshTokenString,
  refreshTokenHashString,
  familyIdString,
  freshRefreshToken,
  freshFamilyId,
  hashRefreshToken,
  scopesToText,
} from "plgg-auth/index";
import { box } from "plgg";

test("asRefreshToken / guard / string", () =>
  all([
    check(
      asRefreshToken("abc"),
      okThen((t) =>
        all([
          check(isRefreshToken(t), toBe(true)),
          check(
            refreshTokenString(t),
            toBe("abc"),
          ),
        ]),
      ),
    ),
    check(
      asRefreshToken(""),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("asRefreshTokenHash requires a 43-char digest", () =>
  all([
    check(
      asRefreshTokenHash("h".repeat(43)),
      okThen((h) =>
        all([
          check(
            isRefreshTokenHash(h),
            toBe(true),
          ),
          check(
            refreshTokenHashString(h).length,
            toBe(43),
          ),
        ]),
      ),
    ),
    check(
      asRefreshTokenHash("short"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("asFamilyId / guard / string", () =>
  all([
    check(
      asFamilyId("fam"),
      okThen((f) =>
        all([
          check(isFamilyId(f), toBe(true)),
          check(familyIdString(f), toBe("fam")),
        ]),
      ),
    ),
    check(
      asFamilyId(""),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("fresh generators produce 43-char, distinct values", () =>
  all([
    check(
      freshRefreshToken().content.length,
      toBe(43),
    ),
    check(
      freshFamilyId().content.length,
      toBe(43),
    ),
    check(
      freshRefreshToken().content ===
        freshRefreshToken().content,
      toBe(false),
    ),
  ]));

test("hashRefreshToken is a stable 43-char digest", async () => {
  const token = freshRefreshToken();
  const a = await hashRefreshToken(token);
  const b = await hashRefreshToken(token);
  if (!isOk(a) || !isOk(b)) {
    return check(isOk(a) && isOk(b), toBe(true));
  }
  return all([
    check(a.content.content.length, toBe(43)),
    check(
      a.content.content === b.content.content,
      toBe(true),
    ),
  ]);
});

test("scopesToText joins scope contents on spaces", () =>
  check(
    scopesToText([
      box("Scope")("openid"),
      box("Scope")("email"),
    ]),
    toBe("openid email"),
  ));
