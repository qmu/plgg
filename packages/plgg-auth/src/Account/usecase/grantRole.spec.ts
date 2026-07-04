import {
  test,
  check,
  toBe,
  okThen,
  someThen,
} from "plgg-test";
import { box } from "plgg";
import { grantRole } from "plgg-auth/Account/usecase/grantRole";
import { roleOf } from "plgg-auth/Account/usecase/roleOf";
import { memoryAccountStore } from "plgg-auth/Account/testkit/memoryAccountStore";

test("grantRole upserts: a second grant overwrites the role", async () => {
  const store = memoryAccountStore();
  const s = box("Subject")("s1");
  await grantRole(store)(s, "guest");
  await grantRole(store)(s, "admin");
  return check(
    await roleOf(store)(s),
    okThen((o) =>
      check(
        o,
        someThen((r) => check(r, toBe("admin"))),
      ),
    ),
  );
});
