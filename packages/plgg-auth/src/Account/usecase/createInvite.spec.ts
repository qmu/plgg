import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk } from "plgg";
import {
  inviteTokenString,
  inviteHashString,
} from "plgg-auth/Account/model/Invite";
import { createInvite } from "plgg-auth/Account/usecase/createInvite";
import { hashInviteToken } from "plgg-auth/Account/usecase/hashInviteToken";
import { memoryAccountStore } from "plgg-auth/Account/testkit/memoryAccountStore";

test("createInvite returns the plaintext once and stores only its hash", async () => {
  const store = memoryAccountStore();
  const minted = await createInvite(
    store,
    () => 1000,
  )("guest", 60);
  if (!isOk(minted)) {
    return check(false, toBe(true));
  }
  const rehash = await hashInviteToken(
    minted.content.token,
  );
  if (!isOk(rehash)) {
    return check(false, toBe(true));
  }
  return all([
    check(
      inviteTokenString(minted.content.token)
        .length > 0,
      toBe(true),
    ),
    check(
      inviteHashString(
        minted.content.invite.hash,
      ),
      toBe(inviteHashString(rehash.content)),
    ),
    check(
      minted.content.invite.expiresAt,
      toBe(1060),
    ),
    check(
      minted.content.invite.role,
      toBe("guest"),
    ),
  ]);
});
