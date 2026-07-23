import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { usernameString } from "plgg-auth/Account/model/Account";
import {
  asAccountRow,
  asRoleRow,
  asInviteRow,
} from "plgg-auth/Account/Sql/accountRows";

const HASH =
  "pbkdf2$sha256$600000$c2FsdA$ZGVyaXZlZA";
const IHASH =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";

test("asAccountRow decodes a valid row, rejects a mis-shaped one", () =>
  all([
    check(
      asAccountRow({
        subject: "s1",
        username: "Alice",
        password_hash: HASH,
        created_at: 5,
      }),
      okThen((a) =>
        check(
          usernameString(a.username),
          toBe("alice"),
        ),
      ),
    ),
    check(
      asAccountRow({ subject: "s1" }),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("asRoleRow decodes a role", () =>
  check(
    asRoleRow({ role: "admin" }),
    okThen((r) => check(r, toBe("admin"))),
  ));

test("asInviteRow decodes an invite, rejects a bad role", () =>
  all([
    check(
      asInviteRow({
        token_hash: IHASH,
        role: "guest",
        expires_at: 10,
      }),
      okThen((i) => check(i.role, toBe("guest"))),
    ),
    check(
      asInviteRow({
        token_hash: IHASH,
        role: "root",
        expires_at: 10,
      }),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));
