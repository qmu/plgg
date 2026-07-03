import {
  test,
  check,
  all,
  toBe,
  errThen,
} from "plgg-test";
import { box, some, none, isOk } from "plgg";
import {
  generateRsaKey,
  computeS256Challenge,
  asCodeVerifier,
  authorize,
  completeAuthorization,
  exchangeCode,
  oidcErrorKind,
  PendingRequest,
  AuthorizationRequest,
} from "plgg-auth/index";
import { memoryStore } from "plgg-auth/Oidc/testkit/memoryStore";
import {
  RP_REDIRECT,
  publicClient,
  makeConfigWithStore,
  overrideStore,
  boom,
  subject,
  clientId,
  redirectUri,
} from "plgg-auth/Oidc/testkit/harness";

const verifierString = "a".repeat(64);

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

const requestFixture = (
  challenge: string,
): AuthorizationRequest => ({
  clientId: clientId("demo-rp"),
  redirectUri: redirectUri(RP_REDIRECT),
  scopes: [box("Scope")("openid")],
  state: none(),
  nonce: none(),
  codeChallenge: box("CodeChallenge")(challenge),
});

test("authorize with a failing savePendingRequest is a StoreFailure", async () => {
  const s = await kp();
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
      savePendingRequest: boom,
    }),
    clock,
  );
  const outcome = await authorize(config)(
    query(s.challenge),
    none(),
  )();
  return check(
    outcome.kind === "LocalError"
      ? outcome.error.content.kind
      : "",
    toBe("StoreFailure"),
  );
});

test("completeAuthorization with a failing saveSession is a StoreFailure", async () => {
  const s = await kp();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const pending: PendingRequest = {
    id: box("PendingRequestId")("p-1"),
    request: requestFixture(s.challenge),
    expiresAt: clock.now + 600,
  };
  await base.savePendingRequest(pending);
  const config = makeConfigWithStore(
    overrideStore(base, { saveSession: boom }),
    clock,
  );
  return check(
    await completeAuthorization(config)(
      pending.id,
      subject("u"),
    )(),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("StoreFailure"),
      ),
    ),
  );
});

test("completeAuthorization with a failing saveCode is a StoreFailure", async () => {
  const s = await kp();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const pending: PendingRequest = {
    id: box("PendingRequestId")("p-2"),
    request: requestFixture(s.challenge),
    expiresAt: clock.now + 600,
  };
  await base.savePendingRequest(pending);
  const config = makeConfigWithStore(
    overrideStore(base, { saveCode: boom }),
    clock,
  );
  return check(
    await completeAuthorization(config)(
      pending.id,
      subject("u"),
    )(),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("StoreFailure"),
      ),
    ),
  );
});

test("exchangeCode with a failing takeCode is a StoreFailure", async () => {
  const s = await kp();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const config = makeConfigWithStore(
    overrideStore(base, { takeCode: boom }),
    clock,
  );
  return check(
    await exchangeCode(config)(publicClient)(
      Object.fromEntries(
        new URLSearchParams({
          code: "anything",
          redirect_uri: RP_REDIRECT,
          client_id: "demo-rp",
          code_verifier: verifierString,
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

test("token issuance with a failing saveAccessGrant is a StoreFailure", async () => {
  const s = await kp();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  // Seed a valid code directly, then fail the grant save.
  const code = box("AuthCode")("seed-code");
  await base.saveCode({
    code,
    clientId: clientId("demo-rp"),
    redirectUri: redirectUri(RP_REDIRECT),
    subject: subject("u"),
    scopes: [box("Scope")("openid")],
    nonce: none(),
    codeChallenge: box("CodeChallenge")(
      s.challenge,
    ),
    expiresAt: clock.now + 60,
  });
  const config = makeConfigWithStore(
    overrideStore(base, {
      saveAccessGrant: boom,
    }),
    clock,
  );
  return check(
    await exchangeCode(config)(publicClient)(
      Object.fromEntries(
        new URLSearchParams({
          code: "seed-code",
          redirect_uri: RP_REDIRECT,
          client_id: "demo-rp",
          code_verifier: verifierString,
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

test("authorize completes immediately on a live session (skips login)", async () => {
  const s = await kp();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  const session = {
    id: box("SessionId")("sess-1"),
    subject: subject("u"),
    expiresAt: clock.now + 86400,
  };
  await base.saveSession(session);
  const config = makeConfigWithStore(base, clock);
  const outcome = await authorize(config)(
    query(s.challenge),
    some("sess-1"),
  )();
  return all([
    check(outcome.kind, toBe("RedirectToClient")),
    check(
      outcome.kind === "RedirectToClient"
        ? new URL(outcome.location).origin +
            new URL(outcome.location).pathname
        : "",
      toBe(RP_REDIRECT),
    ),
  ]);
});

test("an expired session falls back to the login route", async () => {
  const s = await kp();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  await base.saveSession({
    id: box("SessionId")("old"),
    subject: subject("u"),
    expiresAt: clock.now - 1,
  });
  const config = makeConfigWithStore(base, clock);
  const outcome = await authorize(config)(
    query(s.challenge),
    some("old"),
  )();
  return check(
    outcome.kind,
    toBe("LoginRequired"),
  );
});
