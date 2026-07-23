import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { box, isOk, isNone, isSome } from "plgg";
import {
  account,
  asUsername,
} from "plgg-auth/Account/model/Account";
import { hashPassword } from "plgg-auth/Account/usecase/hashPassword";
import { grantRole } from "plgg-auth/Account/usecase/grantRole";
import { revokeRole } from "plgg-auth/Account/usecase/revokeRole";
import { roleOf } from "plgg-auth/Account/usecase/roleOf";
import { memoryAccountStore } from "plgg-auth/Account/testkit/memoryAccountStore";

test("revokeRole removes the role but leaves the account intact", async () => {
  const store = memoryAccountStore();
  const h = await hashPassword("pw");
  const name = asUsername("alice");
  if (!isOk(h) || !isOk(name)) {
    return check(false, toBe(true));
  }
  const s = box("Subject")("s1");
  await store.saveAccount(
    account(s, name.content, h.content, 0),
  );
  await grantRole(store)(s, "admin");
  await revokeRole(store)(s);
  return all([
    check(
      await roleOf(store)(s),
      okThen((o) => check(isNone(o), toBe(true))),
    ),
    check(
      isSome(
        await store.findAccountByUsername(
          name.content,
        ),
      ),
      toBe(true),
    ),
  ]);
});
