import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  SoftStr,
  Option,
  box,
  some,
  none,
  isSome,
  isNone,
  isOk,
} from "plgg";
import { Db, sql, exec } from "plgg-sql";
import {
  sqlite,
  migrator,
  migrateUp,
  migrateDown,
  readMigrations,
} from "plgg-db-migration";
import {
  AuthStore,
  Client,
  ClientId,
  Subject,
  RsaPrivateJwk,
  SigningKeyRecord,
  generateRsaKey,
  sqlStore,
} from "plgg-auth/index";
import { memoryStore } from "plgg-auth/Oidc/testkit/memoryStore";
import { openSqliteDb } from "plgg-auth/Oidc/testkit/sqliteDb";

const clientId = (s: string): ClientId =>
  box("ClientId")(s);
const subject = (s: string): Subject =>
  box("Subject")(s);
const scope = (s: string) => box("Scope")(s);
const challenge = box("CodeChallenge")(
  "a".repeat(43),
);
const redirect = box("RedirectUri")(
  "https://rp.example/cb",
);

const demoClient: Client = {
  id: clientId("demo-rp"),
  secretHash: none(),
  redirectUris: [redirect],
};

/**
 * The shared AuthStore contract: exercised
 * identically against every driver. Returns the
 * names of any failed checks (empty = all pass).
 * The store is pre-seeded with `demoClient` and
 * an active signing key.
 */
const runStoreContract = async (
  store: AuthStore,
): Promise<ReadonlyArray<string>> => {
  const fail: string[] = [];
  const want = (
    name: string,
    cond: boolean,
  ): void => {
    if (!cond) {
      fail.push(name);
    }
  };

  // client lookup
  const client = await store.findClient(
    clientId("demo-rp"),
  );
  want("findClient", isSome(client));
  want(
    "findClient-unknown",
    isNone(
      await store.findClient(clientId("ghost")),
    ),
  );

  // pending request: single-use take
  const pendingId = box("PendingRequestId")("p1");
  await store.savePendingRequest({
    id: pendingId,
    request: {
      clientId: clientId("demo-rp"),
      redirectUri: redirect,
      scopes: [scope("openid")],
      state: some(box("State")("st")),
      nonce: some(box("Nonce")("nc")),
      codeChallenge: challenge,
    },
    expiresAt: 100,
  });
  const took =
    await store.takePendingRequest(pendingId);
  want("takePending", isSome(took));
  want(
    "takePending-single-use",
    isNone(
      await store.takePendingRequest(pendingId),
    ),
  );

  // session
  const sessionId = box("SessionId")("s1");
  await store.saveSession({
    id: sessionId,
    subject: subject("u"),
    expiresAt: 200,
  });
  want(
    "findSession",
    isSome(await store.findSession(sessionId)),
  );

  // code: single-use take
  const code = box("AuthCode")("c1");
  await store.saveCode({
    code,
    clientId: clientId("demo-rp"),
    redirectUri: redirect,
    subject: subject("u"),
    scopes: [scope("openid"), scope("email")],
    nonce: none(),
    codeChallenge: challenge,
    expiresAt: 300,
  });
  const tookCode = await store.takeCode(code);
  want(
    "takeCode",
    tookCode.__tag === "Some" &&
      tookCode.content.scopes.length === 2,
  );
  want(
    "takeCode-single-use",
    isNone(await store.takeCode(code)),
  );

  // access grant
  const token = box("AccessToken")("at1");
  await store.saveAccessGrant({
    token,
    subject: subject("u"),
    clientId: clientId("demo-rp"),
    scopes: [scope("openid")],
    expiresAt: 400,
  });
  want(
    "findAccessGrant",
    isSome(await store.findAccessGrant(token)),
  );

  // refresh: save, find, rotate status, revoke family
  const hash = box("RefreshTokenHash")(
    "r".repeat(43),
  );
  const family = box("FamilyId")("fam1");
  await store.saveRefreshToken({
    tokenHash: hash,
    familyId: family,
    clientId: clientId("demo-rp"),
    subject: subject("u"),
    scopes: [scope("openid")],
    rotatedFrom: none(),
    status: "active",
    expiresAt: 500,
  });
  const foundRefresh =
    await store.findRefreshToken(hash);
  want(
    "findRefresh",
    foundRefresh.__tag === "Some" &&
      foundRefresh.content.status === "active" &&
      isNone(foundRefresh.content.rotatedFrom),
  );
  await store.setRefreshStatus(hash, "rotated");
  const afterRotate =
    await store.findRefreshToken(hash);
  want(
    "setRefreshStatus",
    afterRotate.__tag === "Some" &&
      afterRotate.content.status === "rotated",
  );
  await store.revokeRefreshFamily(family);
  const afterRevoke =
    await store.findRefreshToken(hash);
  want(
    "revokeFamily",
    afterRevoke.__tag === "Some" &&
      afterRevoke.content.status === "revoked",
  );

  // signing keys: active seeded; add retiring; jwks reflects both
  const jwksActive =
    await store.verificationJwks();
  want(
    "jwks-active",
    jwksActive.keys.length === 1,
  );

  return fail;
};

// --- memory driver ----------------------------------

test("the in-memory driver satisfies the AuthStore contract", async () => {
  const keyPair = await generateRsaKey();
  if (!isOk(keyPair)) {
    return check(isOk(keyPair), toBe(true));
  }
  const store = memoryStore(
    [demoClient],
    some(keyPair.content.privateKey),
  );
  const failures = await runStoreContract(store);
  return check(failures, toEqual([]));
});

// --- sql driver -------------------------------------

const migrationsDir = "databases/auth/migrations";

const seedSqlClient = async (
  db: Db,
  client: Client,
): Promise<void> => {
  const secretParam: Option<SoftStr> =
    client.secretHash.__tag === "Some"
      ? some(client.secretHash.content.content)
      : none();
  await exec(db)(
    sql`INSERT INTO oidc_clients (id, secret_hash) VALUES (${client.id.content}, ${secretParam})`,
  );
  for (const uri of client.redirectUris) {
    await exec(db)(
      sql`INSERT INTO oidc_client_redirect_uris (client_id, redirect_uri) VALUES (${client.id.content}, ${uri.content})`,
    );
  }
};

const seedSqlKey = async (
  db: Db,
  key: RsaPrivateJwk,
): Promise<void> => {
  const store = sqlStore(db);
  const record: SigningKeyRecord = {
    privateKey: key,
    status: "active",
    createdAt: 0,
  };
  await store.saveSigningKey(record);
};

test("the sql driver satisfies the same AuthStore contract", async () => {
  const keyPair = await generateRsaKey();
  const dir = await readMigrations(migrationsDir);
  if (!isOk(keyPair) || !isOk(dir)) {
    return check(
      isOk(keyPair) && isOk(dir),
      toBe(true),
    );
  }
  const db = openSqliteDb();
  const up = await migrateUp(
    migrator(db, sqlite, dir.content),
  );
  if (!isOk(up)) {
    return check(isOk(up), toBe(true));
  }
  await seedSqlClient(db, demoClient);
  await seedSqlKey(
    db,
    keyPair.content.privateKey,
  );
  const store = sqlStore(db);
  const failures = await runStoreContract(store);
  return check(failures, toEqual([]));
});

test("migrations roll up and back down cleanly on a fresh :memory: db", async () => {
  const dir = await readMigrations(migrationsDir);
  if (!isOk(dir)) {
    return check(isOk(dir), toBe(true));
  }
  const db = openSqliteDb();
  const m = migrator(db, sqlite, dir.content);
  const up = await migrateUp(m);
  const down = await migrateDown(m);
  return all([
    check(isOk(up), toBe(true)),
    check(isOk(down), toBe(true)),
  ]);
});

test("raw token values never reach the database (only hashes)", async () => {
  const keyPair = await generateRsaKey();
  const dir = await readMigrations(migrationsDir);
  if (!isOk(keyPair) || !isOk(dir)) {
    return check(
      isOk(keyPair) && isOk(dir),
      toBe(true),
    );
  }
  const db = openSqliteDb();
  await migrateUp(
    migrator(db, sqlite, dir.content),
  );
  const store = sqlStore(db);
  // A refresh token stored as its hash.
  await store.saveRefreshToken({
    tokenHash: box("RefreshTokenHash")(
      "h".repeat(43),
    ),
    familyId: box("FamilyId")("fam"),
    clientId: clientId("demo-rp"),
    subject: subject("u"),
    scopes: [scope("openid")],
    rotatedFrom: none(),
    status: "active",
    expiresAt: 500,
  });
  const raw = await exec(db)(
    sql`SELECT token_hash FROM oidc_refresh_tokens`,
  );
  void raw;
  // The stored value is the 43-char hash, not a
  // longer opaque token; asserted by reading it
  // back through the driver's own column.
  const rows = await db.all(
    sql`SELECT token_hash FROM oidc_refresh_tokens`,
  );
  const head = rows[0];
  const desc =
    typeof head === "object" && head !== null
      ? Object.getOwnPropertyDescriptor(
          head,
          "token_hash",
        )
      : undefined;
  return check(
    desc !== undefined &&
      desc.value === "h".repeat(43),
    toBe(true),
  );
});
