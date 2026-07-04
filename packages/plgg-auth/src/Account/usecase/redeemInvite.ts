import {
  Num,
  Option,
  Result,
  Defect,
  InvalidError,
  ok,
  err,
  proc,
  pipe,
  mapErr,
  matchOption,
} from "plgg";
import { Subject } from "plgg-auth/Oidc/model/Tokens";
import { AccountStore } from "plgg-auth/Account/model/AccountStore";
import {
  Account,
  Username,
  PasswordHash,
  account,
  asUsername,
  freshSubject,
} from "plgg-auth/Account/model/Account";
import {
  Invite,
  InviteToken,
  InviteHash,
} from "plgg-auth/Account/model/Invite";
import {
  AccountError,
  liftAccountStore,
  invalidInvite,
  decodeFailure,
} from "plgg-auth/Account/model/AccountError";
import { hashInviteToken } from "plgg-auth/Account/usecase/hashInviteToken";
import { hashPassword } from "plgg-auth/Account/usecase/hashPassword";

/** A taken invite is usable only if present and unexpired (one outward reason). */
const usableInvite = (
  taken: Option<Invite>,
  now: Num,
): Result<Invite, AccountError> =>
  matchOption(
    (): Result<Invite, AccountError> =>
      err(
        invalidInvite("invalid or expired invite"),
      ),
    (record: Invite): Result<Invite, AccountError> =>
      record.expiresAt < now
        ? err(
            invalidInvite(
              "invalid or expired invite",
            ),
          )
        : ok(record),
  )(taken);

/** Validate the redeeming username into the account-error channel. */
const redeemUsername = (
  username: string,
): Result<Username, AccountError> =>
  pipe(
    asUsername(username),
    mapErr(
      (e: InvalidError): AccountError =>
        decodeFailure(e.content.message),
    ),
  );

/** Provision the new account and grant the invite's role; yield the Subject. */
const provision = (
  store: AccountStore,
  now: Num,
  name: Username,
  passwordHash: PasswordHash,
  role: Invite["role"],
): Promise<Result<Subject, AccountError | Defect>> => {
  const subject = freshSubject();
  const record: Account = account(
    subject,
    name,
    passwordHash,
    now,
  );
  return proc(
    liftAccountStore(() =>
      store.saveAccount(record),
    ),
    () =>
      liftAccountStore(() =>
        store.setRole(subject, role),
      ),
    () => ok(subject),
  );
};

/**
 * Redeem an invite: hash the presented token, `takeInvite` it (a single-
 * transaction get-AND-delete — the double-redeem guard), reject an unknown OR
 * expired invite with one outward reason (no token-existence oracle), then
 * provision a fresh {@link Subject}, hash the password, save the account, and
 * grant the invite's role. The take burns the token even if account creation
 * later fails — fail-safe: a consumed token can never be reused.
 */
export const redeemInvite =
  (store: AccountStore, clock: () => Num) =>
  (
    token: InviteToken,
    username: string,
    password: string,
  ): Promise<
    Result<Subject, AccountError | Defect>
  > =>
    proc(
      hashInviteToken(token),
      (hash: InviteHash) =>
        liftAccountStore(() =>
          store.takeInvite(hash),
        ),
      (taken: Option<Invite>) =>
        usableInvite(taken, clock()),
      (record: Invite) =>
        proc(
          redeemUsername(username),
          (name: Username) =>
            proc(
              hashPassword(password),
              (passwordHash: PasswordHash) =>
                provision(
                  store,
                  clock(),
                  name,
                  passwordHash,
                  record.role,
                ),
            ),
        ),
    );
