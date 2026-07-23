import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { box, isOk } from "plgg";
import { PasswordHash } from "plgg-auth/Account/model/Account";
import { hashPassword } from "plgg-auth/Account/usecase/hashPassword";
import { verifyPassword } from "plgg-auth/Account/usecase/verifyPassword";

/** Build a (possibly malformed) stored-hash value for parse-path coverage. */
const stored = (s: string): PasswordHash =>
  box("PasswordHash")(s);

test("verifyPassword: true for the right password, false for the wrong one", async () => {
  const h = await hashPassword("s3cret");
  if (!isOk(h)) {
    return check(false, toBe(true));
  }
  return all([
    check(
      await verifyPassword("s3cret", h.content),
      okThen((v) => check(v, toBe(true))),
    ),
    check(
      await verifyPassword("wrong", h.content),
      okThen((v) => check(v, toBe(false))),
    ),
  ]);
});

test("verifyPassword returns false when the derived length differs", async () =>
  check(
    await verifyPassword(
      "x",
      stored("pbkdf2$sha256$1$c2FsdA$ZGVyaXZlZA"),
    ),
    okThen((v) => check(v, toBe(false))),
  ));

test("verifyPassword rejects every malformed stored hash shape", async () =>
  all([
    check(
      await verifyPassword(
        "x",
        stored("x$sha256$1$c2FsdA$ZGVyaXZlZA"),
      ),
      errThen((e) => check(e.__tag, toBe("AccountError"))),
    ),
    check(
      await verifyPassword(
        "x",
        stored("pbkdf2$md5$1$c2FsdA$ZGVyaXZlZA"),
      ),
      errThen((e) => check(e.__tag, toBe("AccountError"))),
    ),
    check(
      await verifyPassword(
        "x",
        stored("pbkdf2$sha256"),
      ),
      errThen((e) => check(e.__tag, toBe("AccountError"))),
    ),
    check(
      await verifyPassword(
        "x",
        stored("pbkdf2$sha256$1"),
      ),
      errThen((e) => check(e.__tag, toBe("AccountError"))),
    ),
    check(
      await verifyPassword(
        "x",
        stored("pbkdf2$sha256$1$c2FsdA"),
      ),
      errThen((e) => check(e.__tag, toBe("AccountError"))),
    ),
    check(
      await verifyPassword(
        "x",
        stored(
          "pbkdf2$sha256$1$c2FsdA$ZGVyaXZlZA$extra",
        ),
      ),
      errThen((e) => check(e.__tag, toBe("AccountError"))),
    ),
    check(
      await verifyPassword(
        "x",
        stored("pbkdf2$sha256$abc$c2FsdA$ZGVyaXZlZA"),
      ),
      errThen((e) => check(e.__tag, toBe("AccountError"))),
    ),
    check(
      await verifyPassword(
        "x",
        stored("pbkdf2$sha256$1$AAAAA$ZGVyaXZlZA"),
      ),
      errThen((e) => check(e.__tag, toBe("AccountError"))),
    ),
    check(
      await verifyPassword(
        "x",
        stored("pbkdf2$sha256$1$c2FsdA$AAAAA"),
      ),
      errThen((e) => check(e.__tag, toBe("AccountError"))),
    ),
  ]));
