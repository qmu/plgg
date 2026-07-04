import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { match, otherwise } from "plgg";
import {
  liftAccountStore,
  liftCrypto,
  accountErrorKind,
  accountError$,
} from "plgg-auth/Account/model/AccountError";

test("liftAccountStore folds resolve→Ok and reject→StoreFailure", async () =>
  all([
    check(
      await liftAccountStore(() =>
        Promise.resolve(42),
      ),
      okThen((v) => check(v, toBe(42))),
    ),
    check(
      await liftAccountStore(() =>
        Promise.reject(new Error("boom")),
      ),
      errThen((e) =>
        check(
          accountErrorKind(e),
          toBe("StoreFailure"),
        ),
      ),
    ),
  ]));

test("liftCrypto folds a throw to HashFailure", async () =>
  check(
    await liftCrypto(() =>
      Promise.reject(new Error("x")),
    ),
    errThen((e) =>
      check(
        accountErrorKind(e),
        toBe("HashFailure"),
      ),
    ),
  ));

test("accountError$ matches an AccountError by tag", async () =>
  check(
    await liftAccountStore(() =>
      Promise.reject(new Error("boom")),
    ),
    errThen((e) =>
      check(
        match(e)(
          [accountError$(), () => "matched"],
          [otherwise, () => "other"],
        ),
        toBe("matched"),
      ),
    ),
  ));
