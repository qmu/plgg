import {
  Option,
  Result,
  Defect,
  Bool,
  ok,
  some,
  none,
  proc,
  pipe,
  matchResult,
  matchOption,
} from "plgg";
import { Subject } from "plgg-auth/Oidc/model/Tokens";
import { AccountStore } from "plgg-auth/Account/model/AccountStore";
import {
  Account,
  Username,
  asUsername,
} from "plgg-auth/Account/model/Account";
import { AccountError } from "plgg-auth/Account/model/AccountError";
import { liftAccountStore } from "plgg-auth/Account/model/AccountError";
import { verifyPassword } from "plgg-auth/Account/usecase/verifyPassword";

/** The authenticate result: an optional verified subject. */
type AuthResult = Promise<
  Result<Option<Subject>, AccountError | Defect>
>;

/**
 * Turn a username + password into a verified {@link Subject} — the value an
 * app-owned login route feeds to `completeAuthorization` (which never sees the
 * password). Yields `some(subject)` ONLY on a verified match; an unknown user, a
 * malformed username, and a wrong password all yield `none()` (the same outward
 * result, so there is no username-enumeration oracle).
 */
export const authenticate =
  (store: AccountStore) =>
  (
    username: string,
    password: string,
  ): AuthResult =>
    pipe(
      asUsername(username),
      matchResult(
        (): AuthResult =>
          Promise.resolve(ok(none())),
        (name: Username): AuthResult =>
          proc(
            liftAccountStore(() =>
              store.findAccountByUsername(name),
            ),
            (found: Option<Account>): AuthResult =>
              matchOption(
                (): AuthResult =>
                  Promise.resolve(ok(none())),
                (account: Account): AuthResult =>
                  proc(
                    verifyPassword(
                      password,
                      account.passwordHash,
                    ),
                    (matched: Bool) =>
                      ok(
                        matched
                          ? some(account.subject)
                          : none(),
                      ),
                  ),
              )(found),
          ),
      ),
    );
