import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk, isErr } from "plgg";
import { freshInviteToken } from "plgg-auth/Account/model/Invite";
import { ACCOUNT_SCHEMA } from "plgg-auth/Account/Sql/schema";
import { sqlAccountStore } from "plgg-auth/Account/Sql/accountStore";
import { createInvite } from "plgg-auth/Account/usecase/createInvite";
import { redeemInvite } from "plgg-auth/Account/usecase/redeemInvite";
import { memoryAccountStore } from "plgg-auth/Account/testkit/memoryAccountStore";
import { openSqliteDb } from "plgg-auth/Oidc/testkit/sqliteDb";

test("redeemInvite provisions an account and cannot succeed twice (real transaction)", async () => {
  const db = openSqliteDb();
  await db.execScript(ACCOUNT_SCHEMA);
  const store = sqlAccountStore(db);
  const minted = await createInvite(
    store,
    () => 1000,
  )("guest", 60);
  if (!isOk(minted)) {
    return check(false, toBe(true));
  }
  const first = await redeemInvite(
    store,
    () => 1000,
  )(minted.content.token, "alice", "pw");
  const second = await redeemInvite(
    store,
    () => 1000,
  )(minted.content.token, "bob", "pw");
  return all([
    check(isOk(first), toBe(true)),
    check(isErr(second), toBe(true)),
  ]);
});

test("redeemInvite rejects an expired invite", async () => {
  const store = memoryAccountStore();
  const minted = await createInvite(
    store,
    () => 1000,
  )("guest", 60);
  if (!isOk(minted)) {
    return check(false, toBe(true));
  }
  const redeemed = await redeemInvite(
    store,
    () => 2000,
  )(minted.content.token, "alice", "pw");
  return check(isErr(redeemed), toBe(true));
});

test("redeemInvite rejects an unknown token and a blank username", async () => {
  const store = memoryAccountStore();
  const unknown = await redeemInvite(
    store,
    () => 0,
  )(freshInviteToken(), "alice", "pw");
  const minted = await createInvite(
    store,
    () => 0,
  )("guest", 60);
  if (!isOk(minted)) {
    return check(false, toBe(true));
  }
  const blank = await redeemInvite(
    store,
    () => 0,
  )(minted.content.token, "   ", "pw");
  return all([
    check(isErr(unknown), toBe(true)),
    check(isErr(blank), toBe(true)),
  ]);
});
