import {
  test,
  check,
  toBe,
  okThen,
} from "plgg-test";
import { isPasswordHash } from "plgg-auth/Account/model/Account";
import { hashPassword } from "plgg-auth/Account/usecase/hashPassword";

test("hashPassword produces a stored pbkdf2 hash string", async () =>
  check(
    await hashPassword("correct horse"),
    okThen((h) =>
      check(isPasswordHash(h), toBe(true)),
    ),
  ));

test("hashPassword salts: the same password hashes differently each time", async () => {
  const a = await hashPassword("same");
  const b = await hashPassword("same");
  return check(
    a.__tag === "Ok" &&
      b.__tag === "Ok" &&
      a.content.content !== b.content.content,
    toBe(true),
  );
});
