import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { box, isOk, isSome, isNone } from "plgg";
import {
  account,
  asUsername,
} from "plgg-auth/Account/model/Account";
import { hashPassword } from "plgg-auth/Account/usecase/hashPassword";
import { authenticate } from "plgg-auth/Account/usecase/authenticate";
import { memoryAccountStore } from "plgg-auth/Account/testkit/memoryAccountStore";

test("authenticate: verified→some, wrong password→none, unknown user→none", async () => {
  const store = memoryAccountStore();
  const h = await hashPassword("pw");
  const name = asUsername("Alice");
  if (!isOk(h) || !isOk(name)) {
    return check(false, toBe(true));
  }
  await store.saveAccount(
    account(
      box("Subject")("s1"),
      name.content,
      h.content,
      0,
    ),
  );
  return all([
    check(
      await authenticate(store)("alice", "pw"),
      okThen((o) => check(isSome(o), toBe(true))),
    ),
    check(
      await authenticate(store)("alice", "bad"),
      okThen((o) => check(isNone(o), toBe(true))),
    ),
    check(
      await authenticate(store)("nobody", "pw"),
      okThen((o) => check(isNone(o), toBe(true))),
    ),
    check(
      await authenticate(store)("  ", "pw"),
      okThen((o) => check(isNone(o), toBe(true))),
    ),
  ]);
});
