import {
  test,
  check,
  toBe,
  okThen,
} from "plgg-test";
import { isOk } from "plgg";
import {
  freshInviteToken,
  isInviteHash,
  inviteHashString,
} from "plgg-auth/Account/model/Invite";
import { hashInviteToken } from "plgg-auth/Account/usecase/hashInviteToken";

test("hashInviteToken yields a 43-char InviteHash", async () =>
  check(
    await hashInviteToken(freshInviteToken()),
    okThen((h) =>
      check(isInviteHash(h), toBe(true)),
    ),
  ));

test("hashInviteToken is deterministic for one token", async () => {
  const t = freshInviteToken();
  const a = await hashInviteToken(t);
  const b = await hashInviteToken(t);
  return isOk(a) && isOk(b)
    ? check(
        inviteHashString(a.content),
        toBe(inviteHashString(b.content)),
      )
    : check(false, toBe(true));
});
