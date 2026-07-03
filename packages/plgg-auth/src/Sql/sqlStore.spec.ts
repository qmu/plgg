import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { box, some, none, isNone } from "plgg";
import { Db } from "plgg-sql";
import { sqlStore } from "plgg-auth/index";
import { openSqliteDb } from "plgg-auth/Oidc/testkit/sqliteDb";

/** A Db whose queries reject — for the driver's throw/rollback paths. */
const throwingDb = (): Db => ({
  all: async () => {
    throw new Error("db down");
  },
  run: async () => {
    throw new Error("db down");
  },
  execScript: async () => {
    throw new Error("db down");
  },
  begin: async () => {},
  commit: async () => {},
  rollback: async () => {},
});

const rejects = async (
  op: () => Promise<unknown>,
): Promise<boolean> => {
  try {
    await op();
    return false;
  } catch {
    return true;
  }
};

test("reads over a failing Db reject (the isOk-guard throw path)", async () => {
  const store = sqlStore(throwingDb());
  return all([
    check(
      await rejects(() =>
        store.findSession(box("SessionId")("s")),
      ),
      toBe(true),
    ),
    check(
      await rejects(() =>
        store.findAccessGrant(
          box("AccessToken")("t"),
        ),
      ),
      toBe(true),
    ),
    check(
      await rejects(() =>
        store.findClient(box("ClientId")("c")),
      ),
      toBe(true),
    ),
  ]);
});

test("writes over a failing Db reject (the exec isOk-guard)", async () => {
  const store = sqlStore(throwingDb());
  return all([
    check(
      await rejects(() =>
        store.saveSession({
          id: box("SessionId")("s"),
          subject: box("Subject")("u"),
          expiresAt: 1,
        }),
      ),
      toBe(true),
    ),
    check(
      await rejects(() =>
        store.setRefreshStatus(
          box("RefreshTokenHash")("r".repeat(43)),
          "revoked",
        ),
      ),
      toBe(true),
    ),
    check(
      await rejects(() =>
        store.transitionSigningKey(
          box("Kid")("k"),
          "retired",
        ),
      ),
      toBe(true),
    ),
  ]);
});

test("takeCode rolls back and rejects when the Db fails mid-transaction", async () => {
  // begin ok, all() throws -> rollback path.
  let rolledBack = false;
  const db: Db = {
    all: async () => {
      throw new Error("select failed");
    },
    run: async () => ({
      changes: 0,
      lastInsertId: none(),
    }),
    execScript: async () => {},
    begin: async () => {},
    commit: async () => {},
    rollback: async () => {
      rolledBack = true;
    },
  };
  const store = sqlStore(db);
  const threw = await rejects(() =>
    store.takeCode(box("AuthCode")("c")),
  );
  return all([
    check(threw, toBe(true)),
    check(rolledBack, toBe(true)),
  ]);
});

test("a query returning no rows reads as None (not a throw)", async () => {
  const db = openSqliteDb();
  db.execScript(
    "CREATE TABLE oidc_sessions (id TEXT PRIMARY KEY, subject TEXT NOT NULL, expires_at INTEGER NOT NULL)",
  );
  const store = sqlStore(db);
  return check(
    isNone(
      await store.findSession(
        box("SessionId")("absent"),
      ),
    ),
    toBe(true),
  );
});

test("activeSigningKey is None and jwks empty when no key is stored", async () => {
  const db = openSqliteDb();
  db.execScript(
    "CREATE TABLE oidc_signing_keys (kid TEXT PRIMARY KEY, private_jwk TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL)",
  );
  const store = sqlStore(db);
  return all([
    check(
      isNone(await store.activeSigningKey()),
      toBe(true),
    ),
    check(
      (await store.verificationJwks()).keys
        .length,
      toBe(0),
    ),
  ]);
});

test("a corrupt signing-key row is dropped, not thrown", async () => {
  const db = openSqliteDb();
  db.execScript(
    "CREATE TABLE oidc_signing_keys (kid TEXT PRIMARY KEY, private_jwk TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL)",
  );
  db.execScript(
    "INSERT INTO oidc_signing_keys (kid, private_jwk, status, created_at) VALUES ('k', 'not json', 'active', 0)",
  );
  const store = sqlStore(db);
  // The undecodable row is filtered out -> no active key.
  return check(
    isNone(await store.activeSigningKey()),
    toBe(true),
  );
});

test("takeCode returns None when the stored row is undecodable", async () => {
  const db = openSqliteDb();
  db.execScript(
    "CREATE TABLE oidc_authorization_codes (code TEXT PRIMARY KEY, client_id TEXT, redirect_uri TEXT, subject TEXT, scopes TEXT, nonce TEXT, code_challenge TEXT, expires_at INTEGER)",
  );
  // code_challenge is the wrong shape -> asIssuedCode fails -> None.
  db.execScript(
    "INSERT INTO oidc_authorization_codes VALUES ('c', 'demo-rp', 'https://rp.example/cb', 'u', 'openid', NULL, 'short', 10)",
  );
  const store = sqlStore(db);
  return check(
    isNone(
      await store.takeCode(box("AuthCode")("c")),
    ),
    toBe(true),
  );
});

test("saveCode persists a present nonce (nullable-column Some arm)", async () => {
  const db = openSqliteDb();
  db.execScript(
    "CREATE TABLE oidc_authorization_codes (code TEXT PRIMARY KEY, client_id TEXT, redirect_uri TEXT, subject TEXT, scopes TEXT, nonce TEXT, code_challenge TEXT, expires_at INTEGER)",
  );
  const store = sqlStore(db);
  await store.saveCode({
    code: box("AuthCode")("c1"),
    clientId: box("ClientId")("demo-rp"),
    redirectUri: box("RedirectUri")(
      "https://rp.example/cb",
    ),
    subject: box("Subject")("u"),
    scopes: [box("Scope")("openid")],
    nonce: some(box("Nonce")("n-1")),
    codeChallenge: box("CodeChallenge")(
      "a".repeat(43),
    ),
    expiresAt: 100,
  });
  const taken = await store.takeCode(
    box("AuthCode")("c1"),
  );
  return check(
    taken.__tag === "Some" &&
      taken.content.nonce.__tag === "Some",
    toBe(true),
  );
});
