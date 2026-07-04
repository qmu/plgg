import {
  test,
  check,
  all,
  toBe,
  errThen,
} from "plgg-test";
import { some, none, box, isOk } from "plgg";
import {
  generateRsaKey,
  computeS256Challenge,
  asCodeVerifier,
  refreshGrant,
  oidcErrorKind,
  freshRefreshToken,
  hashRefreshToken,
} from "plgg-auth/index";
import { memoryStore } from "plgg-auth/Oidc/testkit/memoryStore";
import {
  ISSUER,
  RP_REDIRECT,
  publicClient,
  makeConfig,
  makeConfigWithStore,
  overrideStore,
  boom,
  subject,
  clientId,
  makeApp,
  request,
  run,
  headerOf,
  jsonBody,
  codeFrom,
} from "plgg-auth/Oidc/testkit/harness";

const verifierString = "a".repeat(64);

const setup = async () => {
  const keyPair = await generateRsaKey();
  const verifier = asCodeVerifier(verifierString);
  if (!isOk(keyPair) || !isOk(verifier)) {
    return null;
  }
  const challenge = await computeS256Challenge(
    verifier.content,
  );
  return isOk(challenge)
    ? {
        keyPair: keyPair.content,
        challenge: challenge.content.content,
      }
    : null;
};

const authorizeUrl = (
  challenge: string,
): string =>
  `${ISSUER}/authorize?` +
  new URLSearchParams({
    response_type: "code",
    client_id: "demo-rp",
    redirect_uri: RP_REDIRECT,
    scope: "openid",
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

const formHeaders = {
  "content-type":
    "application/x-www-form-urlencoded",
};

/** Drives authorize+login+token and returns the token JSON. */
const initialTokens = async (
  app: ReturnType<typeof makeApp>,
  challenge: string,
): Promise<Readonly<Record<string, unknown>>> => {
  const authorized = await run(
    app,
    request("GET", authorizeUrl(challenge)),
  );
  if (!isOk(authorized)) {
    return {};
  }
  const login = await run(
    app,
    request(
      "GET",
      headerOf(authorized.content, "location"),
    ),
  );
  if (!isOk(login)) {
    return {};
  }
  const code = codeFrom(
    headerOf(login.content, "location"),
  );
  if (code.__tag !== "Some") {
    return {};
  }
  const token = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      formHeaders,
      `grant_type=authorization_code&code=${code.content}` +
        `&redirect_uri=${encodeURIComponent(RP_REDIRECT)}` +
        `&client_id=demo-rp&code_verifier=${verifierString}`,
    ),
  );
  return isOk(token)
    ? jsonBody(token.content)
    : {};
};

test("the code exchange issues a refresh token", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const config = makeConfig(
    s.keyPair,
    [publicClient],
    clock,
  );
  const app = makeApp(config, subject("u"));
  const tokens = await initialTokens(
    app,
    s.challenge,
  );
  return check(
    typeof tokens["refresh_token"],
    toBe("string"),
  );
});

test("a refresh token rotates into a new pair", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const config = makeConfig(
    s.keyPair,
    [publicClient],
    clock,
  );
  const app = makeApp(config, subject("u"));
  const tokens = await initialTokens(
    app,
    s.challenge,
  );
  const refresh = tokens["refresh_token"];
  if (typeof refresh !== "string") {
    return check(typeof refresh, toBe("string"));
  }
  const rotated = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      formHeaders,
      `grant_type=refresh_token&refresh_token=${refresh}&client_id=demo-rp`,
    ),
  );
  if (!isOk(rotated)) {
    return check(isOk(rotated), toBe(true));
  }
  const next = jsonBody(rotated.content);
  return all([
    check(
      rotated.content.status.content,
      toBe(200),
    ),
    check(
      typeof next["access_token"],
      toBe("string"),
    ),
    // a NEW refresh token, different from the first
    check(
      typeof next["refresh_token"],
      toBe("string"),
    ),
    check(
      next["refresh_token"] !== refresh,
      toBe(true),
    ),
  ]);
});

test("reusing a rotated refresh token revokes the whole family", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const config = makeConfig(
    s.keyPair,
    [publicClient],
    clock,
  );
  const app = makeApp(config, subject("u"));
  const tokens = await initialTokens(
    app,
    s.challenge,
  );
  const first = tokens["refresh_token"];
  if (typeof first !== "string") {
    return check(typeof first, toBe("string"));
  }
  // Rotate once (first -> second).
  const rotated = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      formHeaders,
      `grant_type=refresh_token&refresh_token=${first}&client_id=demo-rp`,
    ),
  );
  if (!isOk(rotated)) {
    return check(isOk(rotated), toBe(true));
  }
  const second = jsonBody(rotated.content)[
    "refresh_token"
  ];
  // Reuse the FIRST (now-rotated) token — reuse detected.
  const reuse = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      formHeaders,
      `grant_type=refresh_token&refresh_token=${first}&client_id=demo-rp`,
    ),
  );
  // The second token must now also be dead.
  const secondUse =
    typeof second === "string"
      ? await run(
          app,
          request(
            "POST",
            `${ISSUER}/token`,
            formHeaders,
            `grant_type=refresh_token&refresh_token=${second}&client_id=demo-rp`,
          ),
        )
      : rotated;
  if (!isOk(reuse) || !isOk(secondUse)) {
    return check(
      isOk(reuse) && isOk(secondUse),
      toBe(true),
    );
  }
  return all([
    check(
      jsonBody(reuse.content)["error"],
      toBe("invalid_grant"),
    ),
    // family revoked -> the live second token is dead too
    check(
      jsonBody(secondUse.content)["error"],
      toBe("invalid_grant"),
    ),
  ]);
});

test("an unknown refresh token is invalid_grant", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const config = makeConfig(
    s.keyPair,
    [publicClient],
    clock,
  );
  return check(
    await refreshGrant(config)(publicClient)(
      Object.fromEntries(
        new URLSearchParams({
          refresh_token: "nope-unknown",
        }).entries(),
      ),
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidGrant"),
      ),
    ),
  );
});

test("a missing refresh_token is invalid_request", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const config = makeConfig(
    s.keyPair,
    [publicClient],
    clock,
  );
  return check(
    await refreshGrant(config)(publicClient)({}),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidRequest"),
      ),
    ),
  );
});

test("an expired refresh token is invalid_grant", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const refresh = freshRefreshToken();
  const hash = await hashRefreshToken(refresh);
  if (!isOk(hash)) {
    return check(isOk(hash), toBe(true));
  }
  await base.saveRefreshToken({
    tokenHash: hash.content,
    familyId: box("FamilyId")("f"),
    clientId: clientId("demo-rp"),
    subject: subject("u"),
    scopes: [box("Scope")("openid")],
    rotatedFrom: none(),
    status: "active",
    expiresAt: clock.now - 1,
  });
  const config = makeConfigWithStore(base, clock);
  return check(
    await refreshGrant(config)(publicClient)(
      Object.fromEntries(
        new URLSearchParams({
          refresh_token: refresh.content,
        }).entries(),
      ),
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidGrant"),
      ),
    ),
  );
});

test("a refresh token bound to another client is invalid_grant", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const refresh = freshRefreshToken();
  const hash = await hashRefreshToken(refresh);
  if (!isOk(hash)) {
    return check(isOk(hash), toBe(true));
  }
  await base.saveRefreshToken({
    tokenHash: hash.content,
    familyId: box("FamilyId")("f"),
    clientId: clientId("other-client"),
    subject: subject("u"),
    scopes: [box("Scope")("openid")],
    rotatedFrom: none(),
    status: "active",
    expiresAt: clock.now + 1000,
  });
  const config = makeConfigWithStore(base, clock);
  return check(
    await refreshGrant(config)(publicClient)(
      Object.fromEntries(
        new URLSearchParams({
          refresh_token: refresh.content,
        }).entries(),
      ),
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidGrant"),
      ),
    ),
  );
});

test("refresh on a failing store is a StoreFailure", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const config = makeConfigWithStore(
    overrideStore(base, {
      findRefreshToken: boom,
    }),
    clock,
  );
  return check(
    await refreshGrant(config)(publicClient)(
      Object.fromEntries(
        new URLSearchParams({
          refresh_token: "anything",
        }).entries(),
      ),
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("StoreFailure"),
      ),
    ),
  );
});

// --- store failures mid-rotation -------------------

const seedActiveRefresh = async (
  base: ReturnType<typeof memoryStore>,
  clientName: string,
  clock: { now: number },
) => {
  const t = freshRefreshToken();
  const h = await hashRefreshToken(t);
  if (!isOk(h)) return null;
  await base.saveRefreshToken({
    tokenHash: h.content,
    familyId: box("FamilyId")("f"),
    clientId: clientId(clientName),
    subject: subject("u"),
    scopes: [box("Scope")("openid")],
    rotatedFrom: none(),
    status: "active",
    expiresAt: clock.now + 100000,
  });
  return t;
};

test("a failing setRefreshStatus during rotation is a StoreFailure", async () => {
  const s = await setup();
  if (s === null)
    return check(s === null, toBe(false));
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const t = await seedActiveRefresh(
    base,
    "demo-rp",
    clock,
  );
  if (t === null)
    return check(t === null, toBe(false));
  const config = makeConfigWithStore(
    overrideStore(base, {
      setRefreshStatus: boom,
    }),
    clock,
  );
  return check(
    await refreshGrant(config)(publicClient)(
      Object.fromEntries(
        new URLSearchParams({
          refresh_token: t.content,
        }).entries(),
      ),
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("StoreFailure"),
      ),
    ),
  );
});

test("a failing saveRefreshToken during rotation is a StoreFailure", async () => {
  const s = await setup();
  if (s === null)
    return check(s === null, toBe(false));
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const t = await seedActiveRefresh(
    base,
    "demo-rp",
    clock,
  );
  if (t === null)
    return check(t === null, toBe(false));
  const config = makeConfigWithStore(
    overrideStore(base, {
      saveRefreshToken: boom,
    }),
    clock,
  );
  return check(
    await refreshGrant(config)(publicClient)(
      Object.fromEntries(
        new URLSearchParams({
          refresh_token: t.content,
        }).entries(),
      ),
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("StoreFailure"),
      ),
    ),
  );
});

test("a failing revokeRefreshFamily on reuse is a StoreFailure", async () => {
  const s = await setup();
  if (s === null)
    return check(s === null, toBe(false));
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  // Seed a ROTATED token (reuse triggers family revoke).
  const t = freshRefreshToken();
  const h = await hashRefreshToken(t);
  if (!isOk(h)) return check(isOk(h), toBe(true));
  await base.saveRefreshToken({
    tokenHash: h.content,
    familyId: box("FamilyId")("f"),
    clientId: clientId("demo-rp"),
    subject: subject("u"),
    scopes: [box("Scope")("openid")],
    rotatedFrom: none(),
    status: "rotated",
    expiresAt: clock.now + 100000,
  });
  const config = makeConfigWithStore(
    overrideStore(base, {
      revokeRefreshFamily: boom,
    }),
    clock,
  );
  return check(
    await refreshGrant(config)(publicClient)(
      Object.fromEntries(
        new URLSearchParams({
          refresh_token: t.content,
        }).entries(),
      ),
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("StoreFailure"),
      ),
    ),
  );
});

test("refresh rotation with no signing key is a ServerError", async () => {
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    none(),
  );
  const t = freshRefreshToken();
  const h = await hashRefreshToken(t);
  if (!isOk(h)) return check(isOk(h), toBe(true));
  await base.saveRefreshToken({
    tokenHash: h.content,
    familyId: box("FamilyId")("f"),
    clientId: clientId("demo-rp"),
    subject: subject("u"),
    scopes: [box("Scope")("openid")],
    rotatedFrom: none(),
    status: "active",
    expiresAt: clock.now + 100000,
  });
  const config = makeConfigWithStore(base, clock);
  return check(
    await refreshGrant(config)(publicClient)(
      Object.fromEntries(
        new URLSearchParams({
          refresh_token: t.content,
        }).entries(),
      ),
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("ServerError"),
      ),
    ),
  );
});
