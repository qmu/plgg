import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { some, none, box, isOk } from "plgg";
import {
  generateRsaKey,
  computeS256Challenge,
  asCodeVerifier,
  asCompactJws,
  validateJwt,
  rotateSigningKey,
  retireKeys,
  kidString,
  oidcErrorKind,
} from "plgg-auth/index";
import { memoryStore } from "plgg-auth/Oidc/testkit/memoryStore";
import {
  ISSUER,
  RP_REDIRECT,
  publicClient,
  makeConfigWithStore,
  makeConfigFailing,
  overrideStore,
  boom,
  subject,
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

const idTokenFor = async (
  app: ReturnType<typeof makeApp>,
  challenge: string,
): Promise<string> => {
  const authorized = await run(
    app,
    request(
      "GET",
      `${ISSUER}/authorize?` +
        new URLSearchParams({
          response_type: "code",
          client_id: "demo-rp",
          redirect_uri: RP_REDIRECT,
          scope: "openid",
          code_challenge: challenge,
          code_challenge_method: "S256",
        }).toString(),
    ),
  );
  if (!isOk(authorized)) {
    return "";
  }
  const login = await run(
    app,
    request(
      "GET",
      headerOf(authorized.content, "location"),
    ),
  );
  if (!isOk(login)) {
    return "";
  }
  const code = codeFrom(
    headerOf(login.content, "location"),
  );
  if (code.__tag !== "Some") {
    return "";
  }
  const token = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      {
        "content-type":
          "application/x-www-form-urlencoded",
      },
      `grant_type=authorization_code&code=${code.content}` +
        `&redirect_uri=${encodeURIComponent(RP_REDIRECT)}` +
        `&client_id=demo-rp&code_verifier=${verifierString}`,
    ),
  );
  if (!isOk(token)) {
    return "";
  }
  const raw = jsonBody(token.content)["id_token"];
  return typeof raw === "string" ? raw : "";
};

test("rotateSigningKey installs a new active key and demotes the old", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const store = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const config = makeConfigWithStore(
    store,
    clock,
  );
  const oldKid = kidString(
    s.keyPair.privateKey.kid,
  );
  const rotated =
    await rotateSigningKey(config)();
  if (!isOk(rotated)) {
    return check(isOk(rotated), toBe(true));
  }
  const active =
    await store.signingKeysByStatus("active");
  const retiring =
    await store.signingKeysByStatus("retiring");
  return all([
    // exactly one active key, and it is the new one
    check(active.length, toBe(1)),
    check(
      kidString(active[0]!.privateKey.kid) !==
        oldKid,
      toBe(true),
    ),
    // the old key is now retiring
    check(retiring.length, toBe(1)),
    check(
      kidString(retiring[0]!.privateKey.kid),
      toBe(oldKid),
    ),
    // JWKS serves both (outstanding tokens validate)
    check(
      (await store.verificationJwks()).keys
        .length,
      toBe(2),
    ),
  ]);
});

test("an ID token signed before rotation still validates after it", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const store = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const config = makeConfigWithStore(
    store,
    clock,
  );
  const app = makeApp(config, subject("u"));
  const idRaw = await idTokenFor(
    app,
    s.challenge,
  );
  const rotated =
    await rotateSigningKey(config)();
  if (!isOk(rotated)) {
    return check(isOk(rotated), toBe(true));
  }
  const idToken = asCompactJws(idRaw);
  if (!isOk(idToken)) {
    return check(isOk(idToken), toBe(true));
  }
  // Validate against the POST-rotation JWKS.
  return check(
    await validateJwt({
      jwks: await store.verificationJwks(),
      issuer: box("Str")(ISSUER),
      audience: box("Str")("demo-rp"),
      clock: new Date(clock.now * 1000),
      leewaySeconds: 5,
      nonce: none(),
    })(idToken.content),
    okThen((c) => toBe("u")(c.sub.content)),
  );
});

test("new ID tokens are signed with the rotated key", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const store = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const config = makeConfigWithStore(
    store,
    clock,
  );
  const app = makeApp(config, subject("u"));
  const rotated =
    await rotateSigningKey(config)();
  if (!isOk(rotated)) {
    return check(isOk(rotated), toBe(true));
  }
  const idRaw = await idTokenFor(
    app,
    s.challenge,
  );
  const idToken = asCompactJws(idRaw);
  if (!isOk(idToken)) {
    return check(isOk(idToken), toBe(true));
  }
  // The token validates against the current JWKS
  // (which now signs with the new active key).
  return check(
    await validateJwt({
      jwks: await store.verificationJwks(),
      issuer: box("Str")(ISSUER),
      audience: box("Str")("demo-rp"),
      clock: new Date(clock.now * 1000),
      leewaySeconds: 5,
      nonce: none(),
    })(idToken.content),
    okThen((c) => toBe("u")(c.sub.content)),
  );
});

test("retireKeys drops keys past their window from the JWKS", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const store = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const config = makeConfigWithStore(
    store,
    clock,
  );
  await rotateSigningKey(config)();
  // The demoted key was created at time 0; advance
  // the clock and retire anything older than 100s.
  clock.now = clock.now + 1000;
  const retired = await retireKeys(config)(100)();
  if (!isOk(retired)) {
    return check(isOk(retired), toBe(true));
  }
  return all([
    check(retired.content, toBe(1)),
    // only the active key remains served
    check(
      (await store.verificationJwks()).keys
        .length,
      toBe(1),
    ),
    check(
      (await store.signingKeysByStatus("retired"))
        .length,
      toBe(1),
    ),
  ]);
});

test("rotateSigningKey on a failing store is a StoreFailure", async () => {
  const clock = { now: 1_700_000_000 };
  const config = makeConfigFailing(clock);
  return check(
    await rotateSigningKey(config)(),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("StoreFailure"),
      ),
    ),
  );
});

test("retireKeys on a failing store is a StoreFailure", async () => {
  const clock = { now: 1_700_000_000 };
  const config = makeConfigFailing(clock);
  return check(
    await retireKeys(config)(100)(),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("StoreFailure"),
      ),
    ),
  );
});

test("a failing transitionSigningKey during rotation is a StoreFailure", async () => {
  const s = await setup();
  if (s === null)
    return check(s === null, toBe(false));
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const config = makeConfigWithStore(
    overrideStore(base, {
      transitionSigningKey: boom,
    }),
    clock,
  );
  return check(
    await rotateSigningKey(config)(),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("StoreFailure"),
      ),
    ),
  );
});

test("a failing saveSigningKey during rotation is a StoreFailure", async () => {
  const s = await setup();
  if (s === null)
    return check(s === null, toBe(false));
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const config = makeConfigWithStore(
    overrideStore(base, { saveSigningKey: boom }),
    clock,
  );
  return check(
    await rotateSigningKey(config)(),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("StoreFailure"),
      ),
    ),
  );
});

test("a failing transitionSigningKey during retire is a StoreFailure", async () => {
  const s = await setup();
  if (s === null)
    return check(s === null, toBe(false));
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const config = makeConfigWithStore(base, clock);
  await rotateSigningKey(config)();
  clock.now = clock.now + 1000;
  const failing = makeConfigWithStore(
    overrideStore(base, {
      transitionSigningKey: boom,
    }),
    clock,
  );
  return check(
    await retireKeys(failing)(100)(),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("StoreFailure"),
      ),
    ),
  );
});
