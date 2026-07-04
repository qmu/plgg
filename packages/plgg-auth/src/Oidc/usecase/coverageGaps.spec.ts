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
  exchangeCode,
  readClientCredential,
  authenticateClient,
  oidcErrorKind,
  Client,
  RsaPrivateJwk,
} from "plgg-auth/index";
import { memoryStore } from "plgg-auth/Oidc/testkit/memoryStore";
import { a2PrivateKey } from "plgg-auth/Jose/testkit/fixtures";
import {
  RP_REDIRECT,
  publicClient,
  makeConfig,
  makeConfigWithStore,
  overrideStore,
  boom,
  subject,
  clientId,
  redirectUri,
  secretHash,
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

const q = (
  over: Record<string, string>,
): Record<string, string> =>
  Object.fromEntries(
    new URLSearchParams({
      response_type: "code",
      client_id: "demo-rp",
      redirect_uri: RP_REDIRECT,
      scope: "openid",
      code_challenge: "a".repeat(43),
      code_challenge_method: "S256",
      ...over,
    }).entries(),
  );

// --- resolveClient malformed-value branches ---------

test("a malformed client_id is a LocalError", async () => {
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
  const outcome = await authorize(config)(
    q({ client_id: "" }),
    none(),
  )();
  return check(outcome.kind, toBe("LocalError"));
});

test("a malformed redirect_uri is a LocalError", async () => {
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
  const outcome = await authorize(config)(
    q({ redirect_uri: "not a uri" }),
    none(),
  )();
  return check(outcome.kind, toBe("LocalError"));
});

test("a post-resolution error with no state still redirects to the RP", async () => {
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
  // Valid client + redirect, but bad scope, no state.
  const outcome = await authorize(config)(
    q({ scope: "profile" }),
    none(),
  )();
  return check(
    outcome.kind,
    toBe("RedirectToClient"),
  );
});

// --- authenticateClient branches --------------------

test("a public client presenting a secret is rejected", async () => {
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    none(),
  );
  const config = makeConfigWithStore(base, clock);
  const cred = readClientCredential(
    { client_id: "demo-rp", client_secret: "x" },
    none(),
  );
  if (!isOk(cred)) {
    return check(isOk(cred), toBe(true));
  }
  return check(
    await authenticateClient(config.store)(
      cred.content,
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidClient"),
      ),
    ),
  );
});

test("a confidential client presenting no secret is rejected", async () => {
  const confidential: Client = {
    id: clientId("demo-rp"),
    secretHash: some(secretHash("a".repeat(43))),
    redirectUris: [redirectUri(RP_REDIRECT)],
  };
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [confidential],
    none(),
  );
  const config = makeConfigWithStore(base, clock);
  const cred = readClientCredential(
    { client_id: "demo-rp" },
    none(),
  );
  if (!isOk(cred)) {
    return check(isOk(cred), toBe(true));
  }
  return check(
    await authenticateClient(config.store)(
      cred.content,
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidClient"),
      ),
    ),
  );
});

test("authenticateClient on an unknown client is InvalidClient", async () => {
  const clock = { now: 1_700_000_000 };
  const base = memoryStore([], none());
  const config = makeConfigWithStore(base, clock);
  const cred = readClientCredential(
    { client_id: "ghost" },
    none(),
  );
  if (!isOk(cred)) {
    return check(isOk(cred), toBe(true));
  }
  return check(
    await authenticateClient(config.store)(
      cred.content,
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidClient"),
      ),
    ),
  );
});

test("authenticateClient on a failing store is a StoreFailure", async () => {
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    none(),
  );
  const config = makeConfigWithStore(
    overrideStore(base, { findClient: boom }),
    clock,
  );
  const cred = readClientCredential(
    { client_id: "demo-rp" },
    none(),
  );
  if (!isOk(cred)) {
    return check(isOk(cred), toBe(true));
  }
  return check(
    await authenticateClient(config.store)(
      cred.content,
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("StoreFailure"),
      ),
    ),
  );
});

// --- readClientCredential branches ------------------

test("readClientCredential handles Basic, malformed Basic, and post", () =>
  all([
    // valid Basic
    check(
      isOk(
        readClientCredential(
          {},
          some(
            `Basic ${Buffer.from("id:secret").toString("base64")}`,
          ),
        ),
      ),
      toBe(true),
    ),
    // Basic without a colon -> malformed
    check(
      readClientCredential(
        {},
        some(
          `Basic ${Buffer.from("nocolon").toString("base64")}`,
        ),
      ),
      errThen((e) =>
        check(
          oidcErrorKind(e),
          toBe("InvalidClient"),
        ),
      ),
    ),
    // no credential at all
    check(
      readClientCredential({}, none()),
      errThen((e) =>
        check(
          oidcErrorKind(e),
          toBe("InvalidClient"),
        ),
      ),
    ),
  ]));

// --- exchangeCode malformed verifier ----------------

test("a malformed code_verifier is invalid_grant", async () => {
  const s = await kp();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  await base.saveCode({
    code: box("AuthCode")("c1"),
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
  const config = makeConfigWithStore(base, clock);
  return check(
    await exchangeCode(config)(publicClient)(
      Object.fromEntries(
        new URLSearchParams({
          code: "c1",
          redirect_uri: RP_REDIRECT,
          client_id: "demo-rp",
          code_verifier: "short",
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

test("issuance when activeSigningKey throws is a StoreFailure", async () => {
  const s = await kp();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const base = memoryStore(
    [publicClient],
    some(s.keyPair.privateKey),
  );
  await base.saveCode({
    code: box("AuthCode")("c-key"),
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
      activeSigningKey: boom,
    }),
    clock,
  );
  return check(
    await exchangeCode(config)(publicClient)(
      Object.fromEntries(
        new URLSearchParams({
          code: "c-key",
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

test("a broken signing key makes issuance a ServerError", async () => {
  const s = await kp();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  // Cryptographically valid key material, but
  // declared `use: "enc"` — WebCrypto rejects it
  // from a signing import (`use` must be `"sig"`)
  // with a DataError on every runtime, so id-token
  // issuance folds to a ServerError deterministically,
  // rather than depending on an OpenSSL build to
  // reject degenerate key material at sign time.
  const encOnlyKey: RsaPrivateJwk = {
    ...a2PrivateKey,
    kid: box("Kid")("k"),
    use: "enc",
  };
  const base = memoryStore(
    [publicClient],
    some(encOnlyKey),
  );
  await base.saveCode({
    code: box("AuthCode")("c-bad"),
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
  const config = makeConfigWithStore(base, clock);
  return check(
    await exchangeCode(config)(publicClient)(
      Object.fromEntries(
        new URLSearchParams({
          code: "c-bad",
          redirect_uri: RP_REDIRECT,
          client_id: "demo-rp",
          code_verifier: verifierString,
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

test("a token request with no client_id anywhere is invalid_client", () => {
  const cred = readClientCredential(
    { grant_type: "authorization_code" },
    none(),
  );
  return check(
    cred,
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidClient"),
      ),
    ),
  );
});

test("a non-Basic authorization header is invalid_client", () => {
  const cred = readClientCredential(
    {},
    some("Bearer something"),
  );
  return check(
    cred,
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidClient"),
      ),
    ),
  );
});

test("token requests missing redirect_uri or code_verifier are invalid_request", async () => {
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
  const noRedirect = await exchangeCode(config)(
    publicClient,
  )(
    Object.fromEntries(
      new URLSearchParams({
        code: "x",
        client_id: "demo-rp",
        code_verifier: verifierString,
      }).entries(),
    ),
  );
  const noVerifier = await exchangeCode(config)(
    publicClient,
  )(
    Object.fromEntries(
      new URLSearchParams({
        code: "x",
        redirect_uri: RP_REDIRECT,
        client_id: "demo-rp",
      }).entries(),
    ),
  );
  return all([
    check(
      noRedirect,
      errThen((e) =>
        check(
          oidcErrorKind(e),
          toBe("InvalidRequest"),
        ),
      ),
    ),
    check(
      noVerifier,
      errThen((e) =>
        check(
          oidcErrorKind(e),
          toBe("InvalidRequest"),
        ),
      ),
    ),
  ]);
});

test("Basic auth with an empty client id is invalid_client", () =>
  check(
    readClientCredential(
      {},
      some(
        `Basic ${Buffer.from(":secret").toString("base64")}`,
      ),
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidClient"),
      ),
    ),
  ));

test("Basic auth with invalid base64 is invalid_client", () =>
  check(
    readClientCredential(
      {},
      some("Basic !!!not-base64!!!"),
    ),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidClient"),
      ),
    ),
  ));

test("Basic auth whose payload fails to base64-decode is invalid_client", () =>
  check(
    readClientCredential({}, some("Basic @@@@")),
    errThen((e) =>
      check(
        oidcErrorKind(e),
        toBe("InvalidClient"),
      ),
    ),
  ));
