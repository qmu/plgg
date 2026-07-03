/**
 * plgg-auth example — a full OpenID Connect
 * round trip between two in-process plgg-server
 * apps: an OP (this library) and an RP (relying
 * party). No sockets — everything runs through
 * `handle(app, request)`.
 *
 * Run it:
 *   npx tsx packages/plgg-auth/example.ts
 *
 * It prints each protocol step and the validated
 * ID-token claims. The login step is stubbed
 * (the app authenticates a fixed user); the
 * provider only owns the protocol.
 */
import {
  Str,
  Dict,
  Result,
  isOk,
  isErr,
  ok,
  box,
  some,
  none,
  matchOption,
} from "plgg";
import {
  web,
  get,
  handle,
  jsonResponse,
  statusOf,
  HttpRequest,
} from "plgg-server";
import {
  generateRsaKey,
  validateJwt,
  asCompactJws,
  computeS256Challenge,
  asCodeVerifier,
  mountOidc,
  sessionRedirect,
  completeAuthorization,
  buildSuccessRedirect,
  asClientId,
  asRedirectUri,
  asSubject,
  asPendingRequestId,
  ProviderConfig,
  Client,
} from "plgg-auth/index";
import { memoryStore } from "plgg-auth/Oidc/testkit/memoryStore";

const parseSearch = (
  search: string,
): Dict<string, string> =>
  Object.fromEntries(
    new URLSearchParams(search).entries(),
  );

const req = (
  method: HttpRequest["method"],
  url: string,
  headers: Record<string, string> = {},
  body = "",
): HttpRequest => {
  const u = new URL(url);
  return {
    method,
    path: u.pathname,
    query: parseSearch(u.search),
    headers,
    params: {},
    body,
    bytes: none(),
  };
};

const must = <T, E>(
  label: string,
  r: Result<T, E>,
): T => {
  if (!isOk(r)) {
    throw new Error(`${label} failed`);
  }
  return r.content;
};

const main = async (): Promise<void> => {
  const ISSUER = "https://op.example";
  const RP_REDIRECT =
    "https://rp.example/callback";

  // --- provider setup ---------------------------------
  const keyPair = must(
    "key generation",
    await generateRsaKey(),
  );
  const client: Client = {
    id: must("client id", asClientId("demo-rp")),
    secretHash: none(),
    redirectUris: [
      must(
        "redirect uri",
        asRedirectUri(RP_REDIRECT),
      ),
    ],
  };
  let now = 1_700_000_000;
  const config: ProviderConfig = {
    issuer: box("Str")(ISSUER),
    loginPath: box("Str")("/login"),
    store: memoryStore(
      [client],
      some(keyPair.privateKey),
    ),
    codeTtlSeconds: 60,
    accessTtlSeconds: 3600,
    idTokenTtlSeconds: 3600,
    sessionTtlSeconds: 86400,
    pendingTtlSeconds: 600,
    clock: () => now,
  };

  // The OP app: the mounted endpoints plus the
  // app-owned /login route that authenticates a
  // fixed user and completes the authorization.
  const op = get("/login", async (c) => {
    const pendingId = must(
      "pending id",
      asPendingRequestId(
        c.req.query["request_id"] ?? "",
      ),
    );
    const subject = must(
      "subject",
      asSubject("user-42"),
    );
    const granted = await completeAuthorization(
      config,
    )(pendingId, subject)();
    if (isErr(granted)) {
      return ok(
        jsonResponse(
          {
            error:
              granted.content.content.message,
          },
          statusOf(400),
        ),
      );
    }
    return sessionRedirect(
      config,
      buildSuccessRedirect(
        granted.content.pending.request,
        granted.content.code.content,
      ),
      granted.content.session.content,
    );
  })(mountOidc(config)(web()));

  const call = (request: HttpRequest) =>
    handle(op, request);

  // --- RP side: build a PKCE request ------------------
  const verifier = must(
    "verifier",
    asCodeVerifier("a".repeat(64)),
  );
  const challenge = must(
    "challenge",
    await computeS256Challenge(verifier),
  );

  console.log("1. discovery");
  const discovery = must(
    "discovery",
    await call(
      req(
        "GET",
        `${ISSUER}/.well-known/openid-configuration`,
      ),
    ),
  );
  console.log(
    "   authorization_endpoint:",
    JSON.parse(
      typeof discovery.body === "string"
        ? discovery.body
        : "{}",
    ).authorization_endpoint,
  );

  console.log("2. authorize -> login redirect");
  const authorizeUrl =
    `${ISSUER}/authorize?response_type=code` +
    `&client_id=demo-rp` +
    `&redirect_uri=${encodeURIComponent(RP_REDIRECT)}` +
    `&scope=openid` +
    `&state=xyz` +
    `&nonce=n-123` +
    `&code_challenge=${challenge.content}` +
    `&code_challenge_method=S256`;
  const authorizeResp = must(
    "authorize",
    await call(req("GET", authorizeUrl)),
  );
  const loginLocation =
    authorizeResp.headers["location"] ?? "";
  console.log("   -> ", loginLocation);

  console.log("3. login -> code redirect");
  const loginResp = must(
    "login",
    await call(req("GET", loginLocation)),
  );
  const callbackLocation =
    loginResp.headers["location"] ?? "";
  const setCookie =
    loginResp.headers["set-cookie"] ?? "";
  const code = new URL(
    callbackLocation,
  ).searchParams.get("code");
  const returnedState = new URL(
    callbackLocation,
  ).searchParams.get("state");
  console.log(
    "   code:",
    code?.slice(0, 12),
    "…  state:",
    returnedState,
    " session cookie set:",
    setCookie.length > 0,
  );

  console.log("4. token exchange");
  const tokenBody =
    `grant_type=authorization_code` +
    `&code=${code}` +
    `&redirect_uri=${encodeURIComponent(RP_REDIRECT)}` +
    `&client_id=demo-rp` +
    `&code_verifier=${verifier.content}`;
  const tokenResp = must(
    "token",
    await call(
      req(
        "POST",
        `${ISSUER}/token`,
        {
          "content-type":
            "application/x-www-form-urlencoded",
        },
        tokenBody,
      ),
    ),
  );
  const tokens = JSON.parse(
    typeof tokenResp.body === "string"
      ? tokenResp.body
      : "{}",
  );
  console.log(
    "   access_token:",
    String(tokens.access_token).slice(0, 12),
    "…  id_token present:",
    typeof tokens.id_token === "string",
  );

  console.log(
    "5. validate the ID token via JWKS",
  );
  must(
    "jwks",
    await call(req("GET", `${ISSUER}/jwks.json`)),
  );
  const idToken = must(
    "id token shape",
    asCompactJws(tokens.id_token),
  );
  const claims = must(
    "id token validation",
    await validateJwt({
      jwks: await config.store.verificationJwks(),
      issuer: box("Str")(ISSUER),
      audience: box("Str")("demo-rp"),
      clock: new Date(now * 1000),
      leewaySeconds: 5,
      nonce: some(box("Str")("n-123")),
    })(idToken),
  );
  console.log(
    "   sub:",
    claims.sub.content,
    " aud:",
    claims.aud.map((a: Str) => a.content),
    " nonce:",
    matchOption(
      () => "-",
      (n: Str) => n.content,
    )(claims.nonce),
  );

  console.log(
    "6. userinfo with the access token",
  );
  const userinfoResp = must(
    "userinfo",
    await call(
      req("GET", `${ISSUER}/userinfo`, {
        authorization: `Bearer ${tokens.access_token}`,
      }),
    ),
  );
  console.log(
    "   userinfo:",
    typeof userinfoResp.body === "string"
      ? userinfoResp.body
      : "",
  );

  console.log(
    "\n✓ full OIDC authorization-code + PKCE round trip complete",
  );
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
