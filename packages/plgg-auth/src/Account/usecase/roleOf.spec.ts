import {
  test,
  check,
  all,
  toBe,
  okThen,
  someThen,
} from "plgg-test";
import { box, isNone } from "plgg";
import { roleOf } from "plgg-auth/Account/usecase/roleOf";
import { grantRole } from "plgg-auth/Account/usecase/grantRole";
import { memoryAccountStore } from "plgg-auth/Account/testkit/memoryAccountStore";

test("roleOf reads None before a grant and the role after", async () => {
  const store = memoryAccountStore();
  const s = box("Subject")("s1");
  const before = await roleOf(store)(s);
  await grantRole(store)(s, "admin");
  const after = await roleOf(store)(s);
  return all([
    check(
      before,
      okThen((o) => check(isNone(o), toBe(true))),
    ),
    check(
      after,
      okThen((o) =>
        check(
          o,
          someThen((r) => check(r, toBe("admin"))),
        ),
      ),
    ),
  ]);
});
