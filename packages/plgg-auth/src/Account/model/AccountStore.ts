import { Option } from "plgg";
import { Subject } from "plgg-auth/Oidc/model/Tokens";
import {
  Account,
  Username,
} from "plgg-auth/Account/model/Account";
import { Role } from "plgg-auth/Account/model/Role";
import {
  Invite,
  InviteHash,
} from "plgg-auth/Account/model/Invite";

/**
 * The account-domain persistence seam, authored in plgg-auth's `AuthStore`
 * shape: a plain object of `Promise`-returning methods. `find*` reads to an
 * `Option`; `save*`/`set*`/`clear*` are `void`; **`takeInvite` is
 * get-AND-delete in ONE transaction** — the single-use guarantee lives in the
 * store contract (a token can never be redeemed twice under a race), not in
 * handler sequencing. Rejections are folded to an `AccountError` at the call
 * site via `liftAccountStore`.
 */
export type AccountStore = {
  findAccountByUsername: (
    username: Username,
  ) => Promise<Option<Account>>;
  saveAccount: (
    account: Account,
  ) => Promise<void>;
  findRole: (
    subject: Subject,
  ) => Promise<Option<Role>>;
  setRole: (
    subject: Subject,
    role: Role,
  ) => Promise<void>;
  clearRole: (subject: Subject) => Promise<void>;
  saveInvite: (invite: Invite) => Promise<void>;
  takeInvite: (
    hash: InviteHash,
  ) => Promise<Option<Invite>>;
};
