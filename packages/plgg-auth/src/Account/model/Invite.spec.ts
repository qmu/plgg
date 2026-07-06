import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { asNum } from "plgg";
import {
  asInviteHash,
  freshInviteToken,
  asInviteToken,
  inviteTokenString,
  invite,
} from "plgg-auth/Account/model/Invite";

test("asInviteHash accepts a 43-char base64url digest", () =>
  all([
    check(
      asInviteHash(
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ",
      ),
      okThen((h) =>
        check(h.__tag, toBe("InviteHash")),
      ),
    ),
    check(
      asInviteHash("too-short"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("asInviteToken rejects an empty token", () =>
  check(
    asInviteToken(""),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("freshInviteToken mints a non-empty token", () =>
  check(
    asInviteToken(
      inviteTokenString(freshInviteToken()),
    ),
    okThen((t) =>
      check(inviteTokenString(t).length > 0, toBe(true)),
    ),
  ));

test("invite carries hash, role, expiry", () =>
  check(
    asInviteHash(
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ",
    ),
    okThen((h) =>
      check(asNum(100), okThen((n) =>
        check(invite(h, "guest", n).role, toBe("guest")),
      )),
    ),
  ));
