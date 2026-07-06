import {
  Num,
  Result,
  Defect,
  ok,
  proc,
} from "plgg";
import { AccountStore } from "plgg-auth/Account/model/AccountStore";
import { Role } from "plgg-auth/Account/model/Role";
import {
  Invite,
  InviteToken,
  InviteHash,
  freshInviteToken,
  invite,
} from "plgg-auth/Account/model/Invite";
import {
  AccountError,
  liftAccountStore,
} from "plgg-auth/Account/model/AccountError";
import { hashInviteToken } from "plgg-auth/Account/usecase/hashInviteToken";

/** What a fresh invite yields: the plaintext token (shown once) and its record. */
export type MintedInvite = Readonly<{
  token: InviteToken;
  invite: Invite;
}>;

/**
 * Mint a single-use invite for `role` expiring `ttlSeconds` from `clock()`. Only
 * the token's SHA-256 hash is stored; the plaintext token is returned exactly
 * once (the admin copies it into a link — a client concern). `clock` is injected
 * for deterministic time.
 */
export const createInvite =
  (store: AccountStore, clock: () => Num) =>
  (
    role: Role,
    ttlSeconds: Num,
  ): Promise<
    Result<MintedInvite, AccountError | Defect>
  > => {
    const token = freshInviteToken();
    return proc(
      hashInviteToken(token),
      (hash: InviteHash) => {
        const record = invite(
          hash,
          role,
          clock() + ttlSeconds,
        );
        return proc(
          liftAccountStore(() =>
            store.saveInvite(record),
          ),
          () => ok({ token, invite: record }),
        );
      },
    );
  };
