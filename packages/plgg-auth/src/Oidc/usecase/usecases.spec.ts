import {
  test,
  check,
  all,
  toBe,
  errThen,
} from "plgg-test";
import { box, none, isOk } from "plgg";
import {
  generateRsaKey,
  computeS256Challenge,
  asCodeVerifier,
  authorize,
  completeAuthorization,
  exchangeCode,
  authenticateBearer,
  oidcErrorKind,
  Client,
  PendingRequest,
  AuthorizationRequest,
} from "plgg-auth/index";
import {
  ISSUER,
  RP_REDIRECT,
  publicClient,
  makeConfig,
  makeConfigFailing,
  subject,
  clientId,
  redirectUri,
  request,
  run,
  makeApp,
  headerOf,
  codeFrom,
} from "plgg-auth/Oidc/testkit/harness";

const verifierString = "a".repeat(64);

const query = (
  challenge: string,
): Record<string, string> =>
  Object.fromEntries(
    new URLSearchParams({
      response_type: "code",
      client_id: "demo-rp",
      redirect_uri: RP_REDIRECT,
      scope: "openid",
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).entries(),
  );

const kp = async () => {
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

// --- store failures fold to StoreFailure ------------

test("authorize on a failing store is a StoreFailure LocalError", async () => {
  const s = await kp();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const config = makeConfigFailing(clock);
  const outcome = await authorize(config)(
    query(s.challenge),
    none(),
  )();
  return all([
    check(outcome.kind, toBe("LocalError")),
    check(
      outcome.kind === "LocalError"
        ? outcome.error.content.kind
        : "",
      toBe("StoreFailure"),
    ),
  ]);
});

test("userinfo on a failing store is a StoreFailure", async () => {
  const clock = { now: 1_700_000_000 };
  const config = makeConfigFailing(clock);
  return check(
    await authenticateBearer(config)(
      "Bearer some-token",
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("StoreFailure"),
      ),
    ),
  );
});

// --- completeAuthorization edge cases ---------------

test("completeAuthorization on an unknown pending id is UnknownPendingRequest", async () => {
  const s = await kp();
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
    await completeAuthorization(config)(
      box("PendingRequestId")("ghost"),
      subject("u"),
    )(),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("UnknownPendingRequest"),
      ),
    ),
  );
});

test("completeAuthorization on an expired pending is UnknownPendingRequest", async () => {
  const s = await kp();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const config = makeConfig(
    s.keyPair,
    [publicClient],
    clock,
  );
  const challengeBox = box("CodeChallenge")(
    s.challenge,
  );
  const req: AuthorizationRequest = {
    clientId: clientId("demo-rp"),
    redirectUri: redirectUri(RP_REDIRECT),
    scopes: [box("Scope")("openid")],
    state: none(),
    nonce: none(),
    codeChallenge: challengeBox,
  };
  const pending: PendingRequest = {
    id: box("PendingRequestId")("p-1"),
    request: req,
    expiresAt: clock.now - 1, // already expired
  };
  await config.store.savePendingRequest(pending);
  return check(
    await completeAuthorization(config)(
      box("PendingRequestId")("p-1"),
      subject("u"),
    )(),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("UnknownPendingRequest"),
      ),
    ),
  );
});

// --- exchangeCode edge cases ------------------------

test("a code issued to a different client is invalid_grant", async () => {
  const s = await kp();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const clientA: Client = {
    id: clientId("client-a"),
    secretHash: none(),
    redirectUris: [redirectUri(RP_REDIRECT)],
  };
  const clientB: Client = {
    id: clientId("client-b"),
    secretHash: none(),
    redirectUris: [redirectUri(RP_REDIRECT)],
  };
  const config = makeConfig(
    s.keyPair,
    [clientA, clientB],
    clock,
  );
  const app = makeApp(config, subject("u"));
  // Get a code issued to client-a.
  const authorized = await run(
    app,
    request(
      "GET",
      `${ISSUER}/authorize?` +
        new URLSearchParams({
          response_type: "code",
          client_id: "client-a",
          redirect_uri: RP_REDIRECT,
          scope: "openid",
          code_challenge: s.challenge,
          code_challenge_method: "S256",
        }).toString(),
    ),
  );
  if (!isOk(authorized)) {
    return check(isOk(authorized), toBe(true));
  }
  const login = await run(
    app,
    request(
      "GET",
      headerOf(authorized.content, "location"),
    ),
  );
  if (!isOk(login)) {
    return check(isOk(login), toBe(true));
  }
  const code = codeFrom(
    headerOf(login.content, "location"),
  );
  if (code.__tag !== "Some") {
    return check(code.__tag, toBe("Some"));
  }
  // Redeem it authenticated as client-b.
  const outcome = await exchangeCode(config)(
    clientB,
  )(
    Object.fromEntries(
      new URLSearchParams({
        code: code.content,
        redirect_uri: RP_REDIRECT,
        client_id: "client-b",
        code_verifier: verifierString,
      }).entries(),
    ),
  );
  return check(
    outcome,
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidGrant"),
      ),
    ),
  );
});

test("an empty code value is a malformed invalid_grant", async () => {
  const s = await kp();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const config = makeConfig(
    s.keyPair,
    [publicClient],
    clock,
  );
  const outcome = await exchangeCode(config)(
    publicClient,
  )(
    Object.fromEntries(
      new URLSearchParams({
        code: "",
        redirect_uri: RP_REDIRECT,
        client_id: "demo-rp",
        code_verifier: verifierString,
      }).entries(),
    ),
  );
  return check(
    outcome,
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidGrant"),
      ),
    ),
  );
});

test("authenticateBearer rejects a non-Bearer scheme", async () => {
  const s = await kp();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const config = makeConfig(
    s.keyPair,
    [publicClient],
    clock,
  );
  return all([
    check(
      await authenticateBearer(config)(
        "Basic abc",
      ),
      errThen((e) =>
        check(
          oidcErrorKind(e),
          toBe("Unauthenticated"),
        ),
      ),
    ),
    check(
      await authenticateBearer(config)("Bearer "),
      errThen((e) =>
        check(
          oidcErrorKind(e),
          toBe("Unauthenticated"),
        ),
      ),
    ),
  ]);
});
