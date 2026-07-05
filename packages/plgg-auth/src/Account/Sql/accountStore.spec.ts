import {
  test,
  check,
  all,
  toBe,
  someThen,
} from "plgg-test";
import { box, isOk, isSome, isNone } from "plgg";
import { Db, sql } from "plgg-sql";
import {
  account,
  asUsername,
} from "plgg-auth/Account/model/Account";
import {
  invite,
  asInviteHash,
} from "plgg-auth/Account/model/Invite";
import { ACCOUNT_SCHEMA } from "plgg-auth/Account/Sql/schema";
import { sqlAccountStore } from "plgg-auth/Account/Sql/accountStore";
import { openSqliteDb } from "plgg-auth/Oidc/testkit/sqliteDb";

const HASH = box("PasswordHash")(
  "pbkdf2$sha256$600000$c2FsdA$ZGVyaXZlZA",
);
const IHASH =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";

const freshStore = async () => {
  const db = openSqliteDb();
  await db.execScript(ACCOUNT_SCHEMA);
  return sqlAccountStore(db);
};

/** A Db whose every access throws — to exercise the driver-error paths. */
const throwingDb = (): Db => ({
  all: async () => {
    throw new Error("boom");
  },
  run: async () => {
    throw new Error("boom");
  },
  execScript: async () => {
    throw new Error("boom");
  },
  begin: async () => {
    throw new Error("boom");
  },
  commit: async () => {},
  rollback: async () => {},
});

const rejects = (
  op: () => Promise<unknown>,
): Promise<boolean> =>
  op().then(
    () => false,
    () => true,
  );

test("driver errors reject store reads, writes, and the take transaction", async () => {
  const store = sqlAccountStore(throwingDb());
  const name = asUsername("alice");
  const hash = asInviteHash(IHASH);
  if (!isOk(name) || !isOk(hash)) {
    return check(false, toBe(true));
  }
  return all([
    check(
      await rejects(() =>
        store.findAccountByUsername(name.content),
      ),
      toBe(true),
    ),
    check(
      await rejects(() =>
        store.setRole(
          box("Subject")("s1"),
          "admin",
        ),
      ),
      toBe(true),
    ),
    check(
      await rejects(() =>
        store.takeInvite(hash.content),
      ),
      toBe(true),
    ),
  ]);
});

test("sqlAccountStore round-trips an account, upserts and clears a role", async () => {
  const store = await freshStore();
  const name = asUsername("alice");
  if (!isOk(name)) {
    return check(false, toBe(true));
  }
  const s = box("Subject")("s1");
  await store.saveAccount(
    account(s, name.content, HASH, 0),
  );
  await store.setRole(s, "guest");
  await store.setRole(s, "admin");
  const role = await store.findRole(s);
  await store.clearRole(s);
  return all([
    check(
      isSome(
        await store.findAccountByUsername(
          name.content,
        ),
      ),
      toBe(true),
    ),
    check(
      role,
      someThen((r) => check(r, toBe("admin"))),
    ),
    check(
      isNone(await store.findRole(s)),
      toBe(true),
    ),
  ]);
});

test("sqlAccountStore reads None for an absent account/role", async () => {
  const store = await freshStore();
  const name = asUsername("ghost");
  if (!isOk(name)) {
    return check(false, toBe(true));
  }
  return all([
    check(
      isNone(
        await store.findAccountByUsername(
          name.content,
        ),
      ),
      toBe(true),
    ),
    check(
      isNone(
        await store.findRole(
          box("Subject")("nobody"),
        ),
      ),
      toBe(true),
    ),
  ]);
});

test("findAccountByUsername reads None for an undecodable row", async () => {
  const db = openSqliteDb();
  await db.execScript(ACCOUNT_SCHEMA);
  await db.run(
    sql`INSERT INTO accounts (subject, username, password_hash, created_at) VALUES (${"s1"}, ${"alice"}, ${"not-a-valid-hash"}, ${0})`,
  );
  const store = sqlAccountStore(db);
  const name = asUsername("alice");
  return isOk(name)
    ? check(
        isNone(
          await store.findAccountByUsername(
            name.content,
          ),
        ),
        toBe(true),
      )
    : check(false, toBe(true));
});

test("takeInvite is get-and-delete (single-use) over sqlite", async () => {
  const store = await freshStore();
  const h = asInviteHash(IHASH);
  if (!isOk(h)) {
    return check(false, toBe(true));
  }
  await store.saveInvite(
    invite(h.content, "guest", 100),
  );
  const first = await store.takeInvite(h.content);
  const second = await store.takeInvite(
    h.content,
  );
  return all([
    check(
      first,
      someThen((i) => check(i.role, toBe("guest"))),
    ),
    check(isNone(second), toBe(true)),
  ]);
});

test("listAccounts enumerates decodable accounts oldest-first, skipping a corrupt row", async () => {
  const db = openSqliteDb();
  await db.execScript(ACCOUNT_SCHEMA);
  const store = sqlAccountStore(db);
  const alice = asUsername("alice");
  const bob = asUsername("bob");
  if (!isOk(alice) || !isOk(bob)) {
    return check(false, toBe(true));
  }
  await store.saveAccount(
    account(
      box("Subject")("s1"),
      alice.content,
      HASH,
      10,
    ),
  );
  await store.saveAccount(
    account(
      box("Subject")("s2"),
      bob.content,
      HASH,
      20,
    ),
  );
  // a corrupt row (non-numeric created_at) fails asAccountRow
  // and is skipped, not surfaced.
  await db.run(
    sql`INSERT INTO accounts (subject, username, password_hash, created_at) VALUES ('s3', 'carol', 'h', 'not-a-number')`,
  );
  const list = await store.listAccounts();
  return all([
    check(list.length, toBe(2)),
    check(list[0]?.createdAt ?? -1, toBe(10)),
    check(list[1]?.createdAt ?? -1, toBe(20)),
  ]);
});
