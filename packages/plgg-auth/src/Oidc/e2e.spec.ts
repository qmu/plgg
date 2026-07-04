import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
} from "plgg-test";
import { Str, box, some, isOk } from "plgg";
import {
  generateRsaKey,
  computeS256Challenge,
  asCodeVerifier,
  validateJwt,
  asCompactJws,
} from "plgg-auth/index";
import {
  ISSUER,
  RP_REDIRECT,
  publicClient,
  makeConfig,
  makeApp,
  subject,
  request,
  run,
  headerOf,
  jsonBody,
  codeFrom,
  paramFrom,
} from "plgg-auth/Oidc/testkit/harness";

const verifierString = "a".repeat(64);

const authorizeUrl = (
  challenge: string,
): string =>
  `${ISSUER}/authorize?response_type=code` +
  `&client_id=demo-rp` +
  `&redirect_uri=${encodeURIComponent(RP_REDIRECT)}` +
  `&scope=${encodeURIComponent("openid profile")}` +
  `&state=st-1&nonce=n-1` +
  `&code_challenge=${challenge}` +
  `&code_challenge_method=S256`;

const tokenBody = (
  code: string,
  verifier: string,
): string =>
  `grant_type=authorization_code` +
  `&code=${code}` +
  `&redirect_uri=${encodeURIComponent(RP_REDIRECT)}` +
  `&client_id=demo-rp` +
  `&code_verifier=${verifier}`;

test("full authorization-code + PKCE round trip", async () => {
  const keyPair = await generateRsaKey();
  if (!isOk(keyPair)) {
    return check(isOk(keyPair), toBe(true));
  }
  const clock = { now: 1_700_000_000 };
  const config = makeConfig(
    keyPair.content,
    [publicClient],
    clock,
  );
  const app = makeApp(config, subject("user-42"));
  const verifier = asCodeVerifier(verifierString);
  if (!isOk(verifier)) {
    return check(isOk(verifier), toBe(true));
  }
  const challenge = await computeS256Challenge(
    verifier.content,
  );
  if (!isOk(challenge)) {
    return check(isOk(challenge), toBe(true));
  }

  // discovery
  const discovery = await run(
    app,
    request(
      "GET",
      `${ISSUER}/.well-known/openid-configuration`,
    ),
  );
  if (!isOk(discovery)) {
    return check(isOk(discovery), toBe(true));
  }
  const doc = jsonBody(discovery.content);

  // authorize -> login redirect
  const authorize = await run(
    app,
    request(
      "GET",
      authorizeUrl(challenge.content.content),
    ),
  );
  if (!isOk(authorize)) {
    return check(isOk(authorize), toBe(true));
  }
  const loginLocation = headerOf(
    authorize.content,
    "location",
  );

  // login -> code redirect (session cookie set)
  const login = await run(
    app,
    request("GET", loginLocation),
  );
  if (!isOk(login)) {
    return check(isOk(login), toBe(true));
  }
  const callback = headerOf(
    login.content,
    "location",
  );
  const code = codeFrom(callback);
  const setCookie = headerOf(
    login.content,
    "set-cookie",
  );
  if (code.__tag !== "Some") {
    return check(code.__tag, toBe("Some"));
  }

  // token exchange
  const token = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      {
        "content-type":
          "application/x-www-form-urlencoded",
      },
      tokenBody(code.content, verifierString),
    ),
  );
  if (!isOk(token)) {
    return check(isOk(token), toBe(true));
  }
  const tokens = jsonBody(token.content);
  const idTokenRaw =
    typeof tokens["id_token"] === "string"
      ? tokens["id_token"]
      : "";

  // validate the ID token against the served JWKS
  const idToken = asCompactJws(idTokenRaw);
  if (!isOk(idToken)) {
    return check(isOk(idToken), toBe(true));
  }
  const claims = await validateJwt({
    jwks: await config.store.verificationJwks(),
    issuer: box("Str")(ISSUER),
    audience: box("Str")("demo-rp"),
    clock: new Date(clock.now * 1000),
    leewaySeconds: 5,
    nonce: some(box("Str")("n-1")),
  })(idToken.content);

  // userinfo with the access token
  const accessToken =
    typeof tokens["access_token"] === "string"
      ? tokens["access_token"]
      : "";
  const userinfo = await run(
    app,
    request("GET", `${ISSUER}/userinfo`, {
      authorization: `Bearer ${accessToken}`,
    }),
  );
  if (!isOk(userinfo)) {
    return check(isOk(userinfo), toBe(true));
  }

  return all([
    check(doc["issuer"], toBe(ISSUER)),
    check(
      doc["code_challenge_methods_supported"],
      toEqual(["S256"]),
    ),
    check(
      doc[
        "id_token_signing_alg_values_supported"
      ],
      toEqual(["RS256"]),
    ),
    // authorize sent us to the app login route
    check(
      new URL(loginLocation).pathname,
      toBe("/login"),
    ),
    // login redirected back to the RP with state echoed
    check(
      new URL(callback).origin +
        new URL(callback).pathname,
      toBe(RP_REDIRECT),
    ),
    check(
      paramFrom(callback, "state").__tag ===
        "Some"
        ? paramFrom(callback, "state").content
        : "",
      toBe("st-1"),
    ),
    check(setCookie.length > 0, toBe(true)),
    check(
      setCookie.includes("HttpOnly"),
      toBe(true),
    ),
    // token response shape
    check(tokens["token_type"], toBe("Bearer")),
    check(
      typeof tokens["access_token"],
      toBe("string"),
    ),
    // ID token validates with the expected claims
    check(
      claims,
      okThen((c) =>
        all([
          check(c.sub.content, toBe("user-42")),
          check(
            c.aud.map((a: Str) => a.content),
            toEqual(["demo-rp"]),
          ),
        ]),
      ),
    ),
    // userinfo returns the subject
    check(
      jsonBody(userinfo.content)["sub"],
      toBe("user-42"),
    ),
  ]);
});

test("a reused authorization code is rejected (single-use)", async () => {
  const keyPair = await generateRsaKey();
  if (!isOk(keyPair)) {
    return check(isOk(keyPair), toBe(true));
  }
  const clock = { now: 1_700_000_000 };
  const config = makeConfig(
    keyPair.content,
    [publicClient],
    clock,
  );
  const app = makeApp(config, subject("user-42"));
  const verifier = asCodeVerifier(verifierString);
  if (!isOk(verifier)) {
    return check(isOk(verifier), toBe(true));
  }
  const challenge = await computeS256Challenge(
    verifier.content,
  );
  if (!isOk(challenge)) {
    return check(isOk(challenge), toBe(true));
  }
  const authorize = await run(
    app,
    request(
      "GET",
      authorizeUrl(challenge.content.content),
    ),
  );
  if (!isOk(authorize)) {
    return check(isOk(authorize), toBe(true));
  }
  const login = await run(
    app,
    request(
      "GET",
      headerOf(authorize.content, "location"),
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
  const body = tokenBody(
    code.content,
    verifierString,
  );
  const headers = {
    "content-type":
      "application/x-www-form-urlencoded",
  };
  const first = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      headers,
      body,
    ),
  );
  const second = await run(
    app,
    request(
      "POST",
      `${ISSUER}/token`,
      headers,
      body,
    ),
  );
  if (!isOk(first) || !isOk(second)) {
    return check(
      isOk(first) && isOk(second),
      toBe(true),
    );
  }
  return all([
    check(
      first.content.status.content,
      toBe(200),
    ),
    check(
      second.content.status.content,
      toBe(400),
    ),
    check(
      jsonBody(second.content)["error"],
      toBe("invalid_grant"),
    ),
  ]);
});
