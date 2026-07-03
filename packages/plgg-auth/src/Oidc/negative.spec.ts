import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { none, some, isOk } from "plgg";
import {
  generateRsaKey,
  computeS256Challenge,
  asCodeVerifier,
  authorize,
  Client,
  hashClientSecret,
} from "plgg-auth/index";
import {
  ISSUER,
  RP_REDIRECT,
  publicClient,
  makeConfig,
  makeConfigNoKey,
  makeConfigFailing,
  makeApp,
  subject,
  clientId,
  redirectUri,
  request,
  run,
  headerOf,
  jsonBody,
  codeFrom,
  paramFrom,
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
  if (!isOk(challenge)) {
    return null;
  }
  return {
    keyPair: keyPair.content,
    challenge: challenge.content.content,
  };
};

const authorizeUrl = (
  challenge: string,
  over: Record<string, string> = {},
): string => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: "demo-rp",
    redirect_uri: RP_REDIRECT,
    scope: "openid",
    state: "st-1",
    code_challenge: challenge,
    code_challenge_method: "S256",
    ...over,
  });
  return `${ISSUER}/authorize?${params.toString()}`;
};

const formHeaders = {
  "content-type":
    "application/x-www-form-urlencoded",
};

const codeFor = async (
  app: ReturnType<typeof makeApp>,
  challenge: string,
): Promise<string> => {
  const authorized = await run(
    app,
    request("GET", authorizeUrl(challenge)),
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
  return code.__tag === "Some"
    ? code.content
    : "";
};

// --- authorize: non-redirectable errors -------------

test("authorize with no client_id is a LocalError (invalid_request)", async () => {
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
  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: RP_REDIRECT,
    scope: "openid",
    code_challenge: s.challenge,
    code_challenge_method: "S256",
  });
  const outcome = await authorize(config)(
    Object.fromEntries(params.entries()),
    none(),
  )();
  return all([
    check(outcome.kind, toBe("LocalError")),
    check(
      outcome.kind === "LocalError"
        ? outcome.error.content.kind
        : "",
      toBe("InvalidRequest"),
    ),
  ]);
});

test("authorize with an unknown client is a LocalError (invalid_client)", async () => {
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
  const outcome = await authorize(config)(
    Object.fromEntries(
      new URLSearchParams({
        response_type: "code",
        client_id: "ghost",
        redirect_uri: RP_REDIRECT,
        scope: "openid",
        code_challenge: s.challenge,
        code_challenge_method: "S256",
      }).entries(),
    ),
    none(),
  )();
  return check(
    outcome.kind === "LocalError"
      ? outcome.error.content.kind
      : "",
    toBe("InvalidClient"),
  );
});

test("authorize with an unregistered redirect_uri is a LocalError", async () => {
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
  const outcome = await authorize(config)(
    Object.fromEntries(
      new URLSearchParams({
        response_type: "code",
        client_id: "demo-rp",
        redirect_uri:
          "https://evil.example/steal",
        scope: "openid",
        code_challenge: s.challenge,
        code_challenge_method: "S256",
      }).entries(),
    ),
    none(),
  )();
  return check(outcome.kind, toBe("LocalError"));
});

test("a post-resolution failure redirects to the RP with the error and state", async () => {
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
  // Valid client + redirect_uri, but scope lacks openid.
  const outcome = await authorize(config)(
    Object.fromEntries(
      new URLSearchParams({
        response_type: "code",
        client_id: "demo-rp",
        redirect_uri: RP_REDIRECT,
        scope: "profile",
        state: "st-9",
        code_challenge: s.challenge,
        code_challenge_method: "S256",
      }).entries(),
    ),
    none(),
  )();
  if (outcome.kind !== "RedirectToClient") {
    return check(
      outcome.kind,
      toBe("RedirectToClient"),
    );
  }
  const url = outcome.location;
  return all([
    check(
      paramFrom(url, "error").__tag === "Some"
        ? paramFrom(url, "error").content
        : "",
      toBe("invalid_scope"),
    ),
    check(
      paramFrom(url, "state").__tag === "Some"
        ? paramFrom(url, "state").content
        : "",
      toBe("st-9"),
    ),
  ]);
});

// --- token endpoint negative paths ------------------

test("an unsupported grant_type is unsupported_grant_type", async () => {
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
  const resp = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      formHeaders,
      "grant_type=client_credentials&client_id=demo-rp",
    ),
  );
  if (!isOk(resp)) {
    return check(isOk(resp), toBe(true));
  }
  return all([
    check(resp.content.status.content, toBe(400)),
    check(
      jsonBody(resp.content)["error"],
      toBe("unsupported_grant_type"),
    ),
  ]);
});

test("a wrong PKCE verifier is invalid_grant", async () => {
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
  const code = await codeFor(app, s.challenge);
  const resp = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      formHeaders,
      `grant_type=authorization_code&code=${code}` +
        `&redirect_uri=${encodeURIComponent(RP_REDIRECT)}` +
        `&client_id=demo-rp&code_verifier=${"b".repeat(64)}`,
    ),
  );
  if (!isOk(resp)) {
    return check(isOk(resp), toBe(true));
  }
  return check(
    jsonBody(resp.content)["error"],
    toBe("invalid_grant"),
  );
});

test("a mismatched redirect_uri at the token endpoint is invalid_grant", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  // Register a second redirect uri so the value
  // parses but does not match the issued code.
  const twoUri: Client = {
    id: clientId("demo-rp"),
    secretHash: none(),
    redirectUris: [
      redirectUri(RP_REDIRECT),
      redirectUri("https://rp.example/other"),
    ],
  };
  const config = makeConfig(
    s.keyPair,
    [twoUri],
    clock,
  );
  const app = makeApp(config, subject("u"));
  const code = await codeFor(app, s.challenge);
  const resp = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      formHeaders,
      `grant_type=authorization_code&code=${code}` +
        `&redirect_uri=${encodeURIComponent("https://rp.example/other")}` +
        `&client_id=demo-rp&code_verifier=${verifierString}`,
    ),
  );
  if (!isOk(resp)) {
    return check(isOk(resp), toBe(true));
  }
  return check(
    jsonBody(resp.content)["error"],
    toBe("invalid_grant"),
  );
});

test("an expired code is invalid_grant", async () => {
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
  const code = await codeFor(app, s.challenge);
  clock.now = clock.now + 120; // past codeTtl (60s)
  const resp = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      formHeaders,
      `grant_type=authorization_code&code=${code}` +
        `&redirect_uri=${encodeURIComponent(RP_REDIRECT)}` +
        `&client_id=demo-rp&code_verifier=${verifierString}`,
    ),
  );
  if (!isOk(resp)) {
    return check(isOk(resp), toBe(true));
  }
  return check(
    jsonBody(resp.content)["error"],
    toBe("invalid_grant"),
  );
});

test("a missing required token field is invalid_request", async () => {
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
  const resp = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      formHeaders,
      "grant_type=authorization_code&client_id=demo-rp",
    ),
  );
  if (!isOk(resp)) {
    return check(isOk(resp), toBe(true));
  }
  return check(
    jsonBody(resp.content)["error"],
    toBe("invalid_request"),
  );
});

test("a confidential client authenticates by secret", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const hash = await hashClientSecret("s3cret");
  if (!isOk(hash)) {
    return check(isOk(hash), toBe(true));
  }
  const clock = { now: 1_700_000_000 };
  const confidential: Client = {
    id: clientId("demo-rp"),
    secretHash: some(hash.content),
    redirectUris: [redirectUri(RP_REDIRECT)],
  };
  const config = makeConfig(
    s.keyPair,
    [confidential],
    clock,
  );
  const app = makeApp(config, subject("u"));
  const code = await codeFor(app, s.challenge);
  const body = (secret: string) =>
    `grant_type=authorization_code&code=${code}` +
    `&redirect_uri=${encodeURIComponent(RP_REDIRECT)}` +
    `&client_id=demo-rp&client_secret=${secret}` +
    `&code_verifier=${verifierString}`;
  const good = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      formHeaders,
      body("s3cret"),
    ),
  );
  // Fresh code needed for the bad-secret attempt.
  const code2 = await codeFor(app, s.challenge);
  const bad = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      formHeaders,
      `grant_type=authorization_code&code=${code2}` +
        `&redirect_uri=${encodeURIComponent(RP_REDIRECT)}` +
        `&client_id=demo-rp&client_secret=wrong` +
        `&code_verifier=${verifierString}`,
    ),
  );
  if (!isOk(good) || !isOk(bad)) {
    return check(
      isOk(good) && isOk(bad),
      toBe(true),
    );
  }
  return all([
    check(good.content.status.content, toBe(200)),
    check(bad.content.status.content, toBe(401)),
    check(
      jsonBody(bad.content)["error"],
      toBe("invalid_client"),
    ),
  ]);
});

test("basic-auth client authentication is accepted", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const hash = await hashClientSecret("s3cret");
  if (!isOk(hash)) {
    return check(isOk(hash), toBe(true));
  }
  const clock = { now: 1_700_000_000 };
  const confidential: Client = {
    id: clientId("demo-rp"),
    secretHash: some(hash.content),
    redirectUris: [redirectUri(RP_REDIRECT)],
  };
  const config = makeConfig(
    s.keyPair,
    [confidential],
    clock,
  );
  const app = makeApp(config, subject("u"));
  const code = await codeFor(app, s.challenge);
  const basic = Buffer.from(
    "demo-rp:s3cret",
  ).toString("base64");
  const resp = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      {
        ...formHeaders,
        authorization: `Basic ${basic}`,
      },
      `grant_type=authorization_code&code=${code}` +
        `&redirect_uri=${encodeURIComponent(RP_REDIRECT)}` +
        `&code_verifier=${verifierString}`,
    ),
  );
  if (!isOk(resp)) {
    return check(isOk(resp), toBe(true));
  }
  return check(
    resp.content.status.content,
    toBe(200),
  );
});

test("no signing key makes token issuance a server_error", async () => {
  const s = await setup();
  if (s === null) {
    return check(s === null, toBe(false));
  }
  const clock = { now: 1_700_000_000 };
  const config = makeConfigNoKey(
    [publicClient],
    clock,
  );
  const app = makeApp(config, subject("u"));
  const code = await codeFor(app, s.challenge);
  const resp = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      formHeaders,
      `grant_type=authorization_code&code=${code}` +
        `&redirect_uri=${encodeURIComponent(RP_REDIRECT)}` +
        `&client_id=demo-rp&code_verifier=${verifierString}`,
    ),
  );
  if (!isOk(resp)) {
    return check(isOk(resp), toBe(true));
  }
  return all([
    check(resp.content.status.content, toBe(500)),
    check(
      jsonBody(resp.content)["error"],
      toBe("server_error"),
    ),
  ]);
});

// --- userinfo negative paths ------------------------

test("userinfo without a bearer token is 401", async () => {
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
  const resp = await run(
    app,
    request("GET", `${ISSUER}/userinfo`),
  );
  if (!isOk(resp)) {
    return check(isOk(resp), toBe(true));
  }
  return check(
    resp.content.status.content,
    toBe(401),
  );
});

test("userinfo with an unknown bearer token is 401", async () => {
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
  const resp = await run(
    app,
    request("GET", `${ISSUER}/userinfo`, {
      authorization: "Bearer nope",
    }),
  );
  if (!isOk(resp)) {
    return check(isOk(resp), toBe(true));
  }
  return check(
    resp.content.status.content,
    toBe(401),
  );
});

test("userinfo with an expired access token is 401", async () => {
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
  const code = await codeFor(app, s.challenge);
  const token = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      formHeaders,
      `grant_type=authorization_code&code=${code}` +
        `&redirect_uri=${encodeURIComponent(RP_REDIRECT)}` +
        `&client_id=demo-rp&code_verifier=${verifierString}`,
    ),
  );
  if (!isOk(token)) {
    return check(isOk(token), toBe(true));
  }
  const access = jsonBody(token.content)[
    "access_token"
  ];
  clock.now = clock.now + 4000; // past accessTtl (3600s)
  const resp = await run(
    app,
    request("GET", `${ISSUER}/userinfo`, {
      authorization: `Bearer ${access}`,
    }),
  );
  if (!isOk(resp)) {
    return check(isOk(resp), toBe(true));
  }
  return check(
    resp.content.status.content,
    toBe(401),
  );
});

// --- session skips the login round trip -------------

test("a live session completes authorize without the login route", async () => {
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
  // First authorization establishes a session.
  const first = await run(
    app,
    request("GET", authorizeUrl(s.challenge)),
  );
  if (!isOk(first)) {
    return check(isOk(first), toBe(true));
  }
  const login = await run(
    app,
    request(
      "GET",
      headerOf(first.content, "location"),
    ),
  );
  if (!isOk(login)) {
    return check(isOk(login), toBe(true));
  }
  const sessionCookie = headerOf(
    login.content,
    "set-cookie",
  );
  const sessionId = sessionCookie
    .split(";")[0]
    ?.split("=")[1];
  // A second authorize with the session cookie
  // should redirect straight back to the RP with
  // a code — no login route.
  const second = await run(
    app,
    request("GET", authorizeUrl(s.challenge), {
      cookie: `plgg_auth_session=${sessionId}`,
    }),
  );
  if (!isOk(second)) {
    return check(isOk(second), toBe(true));
  }
  const location = headerOf(
    second.content,
    "location",
  );
  return all([
    check(
      new URL(location).origin +
        new URL(location).pathname,
      toBe(RP_REDIRECT),
    ),
    check(codeFrom(location).__tag, toBe("Some")),
  ]);
});

test("jwks on a failing store returns a 500 server_error", async () => {
  const clock = { now: 1_700_000_000 };
  const config = makeConfigFailing(clock);
  const app = makeApp(config, subject("u"));
  const resp = await run(
    app,
    request("GET", `${ISSUER}/jwks.json`),
  );
  if (!isOk(resp)) {
    return check(isOk(resp), toBe(true));
  }
  return all([
    check(resp.content.status.content, toBe(500)),
    check(
      jsonBody(resp.content)["error"],
      toBe("server_error"),
    ),
  ]);
});

test("a token request with no grant_type at all is unsupported_grant_type", async () => {
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
  const resp = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      formHeaders,
      "client_id=demo-rp",
    ),
  );
  if (!isOk(resp)) {
    return check(isOk(resp), toBe(true));
  }
  return check(
    jsonBody(resp.content)["error"],
    toBe("unsupported_grant_type"),
  );
});
