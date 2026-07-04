import { fromNullable } from "plgg";
import {
  Subject,
  subjectString,
} from "plgg-auth/Oidc/model/Tokens";
import { AccountStore } from "plgg-auth/Account/model/AccountStore";
import {
  Account,
  Username,
  usernameString,
} from "plgg-auth/Account/model/Account";
import { Role } from "plgg-auth/Account/model/Role";
import {
  Invite,
  InviteHash,
  inviteHashString,
} from "plgg-auth/Account/model/Invite";

/**
 * Test-only in-memory {@link AccountStore} over mutable `Map`s (accounts keyed
 * by username, roles by subject, invites by token hash). `takeInvite` is
 * get-then-`delete` — the single-use contract. Not part of the public API;
 * excluded from coverage.
 */
export const memoryAccountStore =
  (): AccountStore => {
    const accounts = new Map<string, Account>();
    const roles = new Map<string, Role>();
    const invites = new Map<string, Invite>();
    return {
      findAccountByUsername: async (
        username: Username,
      ) =>
        fromNullable(
          accounts.get(usernameString(username)),
        ),
      saveAccount: async (account: Account) => {
        accounts.set(
          usernameString(account.username),
          account,
        );
      },
      findRole: async (subject: Subject) =>
        fromNullable(
          roles.get(subjectString(subject)),
        ),
      setRole: async (
        subject: Subject,
        role: Role,
      ) => {
        roles.set(subjectString(subject), role);
      },
      clearRole: async (subject: Subject) => {
        roles.delete(subjectString(subject));
      },
      saveInvite: async (invite: Invite) => {
        invites.set(
          inviteHashString(invite.hash),
          invite,
        );
      },
      takeInvite: async (hash: InviteHash) => {
        const key = inviteHashString(hash);
        const found = invites.get(key);
        invites.delete(key);
        return fromNullable(found);
      },
    };
  };
