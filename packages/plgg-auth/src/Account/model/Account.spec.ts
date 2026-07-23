import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import {
  asUsername,
  usernameString,
  asPasswordHash,
  freshSubject,
} from "plgg-auth/Account/model/Account";
import { subjectString } from "plgg-auth/Oidc/model/Tokens";

test("asUsername normalizes trim + case-fold", () =>
  all([
    check(
      asUsername("  Alice "),
      okThen((u) =>
        check(usernameString(u), toBe("alice")),
      ),
    ),
    check(
      asUsername("BOB"),
      okThen((u) =>
        check(usernameString(u), toBe("bob")),
      ),
    ),
  ]));

test("asUsername rejects blank input", () =>
  all([
    check(
      asUsername("   "),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asUsername(42),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("asPasswordHash accepts the encoded format, rejects garbage", () =>
  all([
    check(
      asPasswordHash(
        "pbkdf2$sha256$600000$c2FsdA$ZGVyaXZlZA",
      ),
      okThen((h) => check(h.__tag, toBe("PasswordHash"))),
    ),
    check(
      asPasswordHash("plain-password"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("freshSubject mints a non-empty Subject", () =>
  check(
    subjectString(freshSubject()).length > 0,
    toBe(true),
  ));
