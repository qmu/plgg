import {
  Option,
  Result,
  InvalidError,
  none,
  some,
  isOk,
} from "plgg";
import {
  Db,
  Sql,
  sql,
  query,
  exec,
} from "plgg-sql";
import {
  Subject,
  subjectString,
} from "plgg-auth/Oidc/model/Tokens";
import { AccountStore } from "plgg-auth/Account/model/AccountStore";
import {
  Account,
  Username,
  usernameString,
  passwordHashString,
} from "plgg-auth/Account/model/Account";
import { Role } from "plgg-auth/Account/model/Role";
import {
  Invite,
  InviteHash,
  inviteHashString,
} from "plgg-auth/Account/model/Invite";
import {
  asAccountRow,
  asRoleRow,
  asInviteRow,
} from "plgg-auth/Account/Sql/accountRows";

/** Run a write, throwing on a driver error so `liftAccountStore` catches it. */
const run = async (
  db: Db,
  statement: Sql,
): Promise<void> => {
  const result = await exec(db)(statement);
  if (!isOk(result)) {
    throw new Error(result.content.content.message);
  }
};

/** Run a read, throwing on a driver error. */
const rows = async (
  db: Db,
  statement: Sql,
): Promise<ReadonlyArray<unknown>> => {
  const result = await query(db)(statement);
  if (!isOk(result)) {
    throw new Error(result.content.content.message);
  }
  return result.content;
};

/** Decode the first row to an `Option`; a decode failure reads as `None`. */
const firstOf = <T>(
  list: ReadonlyArray<unknown>,
  decode: (
    row: unknown,
  ) => Result<T, InvalidError>,
): Option<T> => {
  const head = list[0];
  if (head === undefined) {
    return none();
  }
  const decoded = decode(head);
  return isOk(decoded)
    ? some(decoded.content)
    : none();
};

/**
 * The plgg-sql-backed {@link AccountStore}. Every value is bound through the
 * injection-safe `sql` template (table names are literals, never params). Rows
 * decode through the domain casters; `takeInvite` copies `takeFrom`'s
 * SELECT+DELETE-in-one-transaction so a token can never be redeemed twice.
 */
export const sqlAccountStore = (
  db: Db,
): AccountStore => {
  const takeInvite = async (
    hash: InviteHash,
  ): Promise<Option<Invite>> => {
    const key = inviteHashString(hash);
    await db.begin();
    try {
      const found = await db.all(
        sql`SELECT token_hash, role, expires_at FROM account_invites WHERE token_hash = ${key}`,
      );
      await db.run(
        sql`DELETE FROM account_invites WHERE token_hash = ${key}`,
      );
      await db.commit();
      return firstOf(found, asInviteRow);
    } catch (cause) {
      await db.rollback();
      throw cause;
    }
  };
  return {
    findAccountByUsername: async (
      username: Username,
    ) =>
      firstOf(
        await rows(
          db,
          sql`SELECT subject, username, password_hash, created_at FROM accounts WHERE username = ${usernameString(
            username,
          )}`,
        ),
        asAccountRow,
      ),
    saveAccount: async (account: Account) =>
      run(
        db,
        sql`INSERT INTO accounts (subject, username, password_hash, created_at) VALUES (${subjectString(
          account.subject,
        )}, ${usernameString(
          account.username,
        )}, ${passwordHashString(
          account.passwordHash,
        )}, ${account.createdAt})`,
      ),
    listAccounts: async () =>
      (
        await rows(
          db,
          sql`SELECT subject, username, password_hash, created_at FROM accounts ORDER BY created_at`,
        )
      ).flatMap((row) => {
        const decoded = asAccountRow(row);
        return isOk(decoded)
          ? [decoded.content]
          : [];
      }),
    findRole: async (subject: Subject) =>
      firstOf(
        await rows(
          db,
          sql`SELECT role FROM account_roles WHERE subject = ${subjectString(
            subject,
          )}`,
        ),
        asRoleRow,
      ),
    setRole: async (
      subject: Subject,
      role: Role,
    ) =>
      run(
        db,
        sql`INSERT INTO account_roles (subject, role) VALUES (${subjectString(
          subject,
        )}, ${role}) ON CONFLICT(subject) DO UPDATE SET role = excluded.role`,
      ),
    clearRole: async (subject: Subject) =>
      run(
        db,
        sql`DELETE FROM account_roles WHERE subject = ${subjectString(
          subject,
        )}`,
      ),
    saveInvite: async (invite: Invite) =>
      run(
        db,
        sql`INSERT INTO account_invites (token_hash, role, expires_at) VALUES (${inviteHashString(
          invite.hash,
        )}, ${invite.role}, ${invite.expiresAt})`,
      ),
    takeInvite,
  };
};
