import {
  test,
  check,
  toBe,
} from "plgg-test";
import {
  type Result,
  box,
  ok,
  err,
  isOk,
  isErr,
  getOr,
  matchResult,
} from "plgg";
import {
  jsonResponse,
  textResponse,
  statusOf,
} from "plgg-http";
import {
  web,
  get,
  internalError,
} from "plgg-server";
import { generateRsaKey } from "plgg-auth/index";
import { jwks } from "plgg-auth/Jose/model/Jwks";
import { transportError } from "plgg-auth/Rp/RpError";
import {
  ISSUER,
  RP_REDIRECT,
  publicClient,
  redirectUri,
  makeConfig,
  makeApp,
  subject,
  request,
  headerOf,
  codeFrom,
  paramFrom,
} from "plgg-auth/Oidc/testkit/harness";
import { type RpConfig } from "plgg-auth/Rp/RpConfig";
import { type RpTransport } from "plgg-auth/Rp/RpTransport";
import { inProcessTransport } from "plgg-auth/Rp/testkit/inProcessTransport";
import {
  type LoginStart,
  beginLogin,
} from "plgg-auth/Rp/beginLogin";
import {
  type LoginResult,
  completeLogin,
} from "plgg-auth/Rp/completeLogin";
import { type RpError } from "plgg-auth/Rp/RpError";

const clock = { now: 1_700_000_000 };

/** An RpConfig; `verificationJwks` supplied by the caller. */
const rpConfig = (
  verificationJwks: RpConfig["verificationJwks"],
): RpConfig => ({
  clientId: publicClient.id,
  redirectUri: redirectUri(RP_REDIRECT),
  issuer: box("Str")(ISSUER),
  authorizePath: "/authorize",
  tokenPath: "/token",
  scope: "openid",
  audience: box("Str")("demo-rp"),
  clock: () => clock.now,
  leewaySeconds: 5,
  verificationJwks,
});

const kind = (
  r: Result<LoginResult, RpError>,
): string =>
  matchResult<LoginResult, RpError, string>(
    (e: RpError) => e.content.kind,
    (v: LoginResult) => `ok:${v.subject.content}`,
  )(r);

const full = (loc: string): string =>
  loc.startsWith("http") ? loc : `${ISSUER}${loc}`;

test("a full RP round trip yields the authenticated subject", async () => {
  const key = await generateRsaKey();
  if (!isOk(key)) {
    return check(isOk(key), toBe(true));
  }
  const config = makeConfig(
    key.content,
    [publicClient],
    clock,
  );
  const app = makeApp(config, subject("user-42"));
  const t = inProcessTransport(app);
  const rp = rpConfig(config.store.verificationJwks);

  const startR = await beginLogin(rp)();
  if (!isOk(startR)) {
    return check(isOk(startR), toBe(true));
  }
  const start: LoginStart = startR.content;

  const authResp = await t(
    request("GET", start.authorizeUrl),
  );
  if (!isOk(authResp)) {
    return check(isOk(authResp), toBe(true));
  }
  const loginResp = await t(
    request(
      "GET",
      full(headerOf(authResp.content, "location")),
    ),
  );
  if (!isOk(loginResp)) {
    return check(isOk(loginResp), toBe(true));
  }
  const callback = headerOf(
    loginResp.content,
    "location",
  );
  const result = await completeLogin(rp, t)(
    {
      code: getOr("")(codeFrom(callback)),
      state: getOr("")(
        paramFrom(callback, "state"),
      ),
    },
    start,
  );
  return check(kind(result), toBe("ok:user-42"));
});

// --- error paths (no OP needed; beginLogin gives a valid state) ---

const stubRp = (): RpConfig =>
  rpConfig(async () => jwks([]));

const deadTransport: RpTransport = async () =>
  ok(jsonResponse({ error: "bad" }, statusOf(400)));

test("a mismatched callback state is StateMismatch", async () => {
  const startR = await beginLogin(stubRp())();
  if (!isOk(startR)) {
    return check(isOk(startR), toBe(true));
  }
  const r = await completeLogin(
    stubRp(),
    deadTransport,
  )(
    { code: "c", state: "not-the-state" },
    startR.content,
  );
  return check(kind(r), toBe("StateMismatch"));
});

test("a callback with no code is MissingCode", async () => {
  const startR = await beginLogin(stubRp())();
  if (!isOk(startR)) {
    return check(isOk(startR), toBe(true));
  }
  const r = await completeLogin(
    stubRp(),
    deadTransport,
  )(
    { state: startR.content.state },
    startR.content,
  );
  return check(kind(r), toBe("MissingCode"));
});

test("an empty-string code is MissingCode", async () => {
  const startR = await beginLogin(stubRp())();
  if (!isOk(startR)) {
    return check(isOk(startR), toBe(true));
  }
  const r = await completeLogin(
    stubRp(),
    deadTransport,
  )(
    { code: "", state: startR.content.state },
    startR.content,
  );
  return check(kind(r), toBe("MissingCode"));
});

test("a wrong stashed nonce fails id_token validation", async () => {
  const key = await generateRsaKey();
  if (!isOk(key)) {
    return check(isOk(key), toBe(true));
  }
  const config = makeConfig(
    key.content,
    [publicClient],
    clock,
  );
  const app = makeApp(config, subject("user-42"));
  const t = inProcessTransport(app);
  const rp = rpConfig(config.store.verificationJwks);
  const startR = await beginLogin(rp)();
  if (!isOk(startR)) {
    return check(isOk(startR), toBe(true));
  }
  const start = startR.content;
  const authResp = await t(
    request("GET", start.authorizeUrl),
  );
  if (!isOk(authResp)) {
    return check(isOk(authResp), toBe(true));
  }
  const loginResp = await t(
    request(
      "GET",
      full(headerOf(authResp.content, "location")),
    ),
  );
  if (!isOk(loginResp)) {
    return check(isOk(loginResp), toBe(true));
  }
  const callback = headerOf(
    loginResp.content,
    "location",
  );
  // tamper the stashed nonce → the id_token's nonce claim
  // will not match → validateJwt rejects it.
  const r = await completeLogin(rp, t)(
    {
      code: getOr("")(codeFrom(callback)),
      state: getOr("")(
        paramFrom(callback, "state"),
      ),
    },
    { ...start, nonce: "tampered-nonce" },
  );
  return check(kind(r), toBe("InvalidIdToken"));
});

test("a non-200 token exchange is TokenExchangeFailed", async () => {
  const startR = await beginLogin(stubRp())();
  if (!isOk(startR)) {
    return check(isOk(startR), toBe(true));
  }
  const r = await completeLogin(
    stubRp(),
    deadTransport,
  )(
    { code: "c", state: startR.content.state },
    startR.content,
  );
  return check(kind(r), toBe("TokenExchangeFailed"));
});

test("beginLogin assembles a PKCE authorize URL", async () => {
  const startR = await beginLogin(stubRp())();
  if (!isOk(startR)) {
    return check(isOk(startR), toBe(true));
  }
  const url = startR.content.authorizeUrl;
  return check(
    url.includes("code_challenge_method=S256") &&
      url.includes("client_id=demo-rp") &&
      url.includes("response_type=code"),
    toBe(true),
  );
});

// A transport that returns a 200 body of the given shape.
const okBody = (
  body: unknown,
): RpTransport =>
  async () =>
    ok(jsonResponse(body, statusOf(200)));

const withStart = async (
  run: (start: LoginStart) => Promise<
    Result<LoginResult, RpError>
  >,
): Promise<Result<LoginResult, RpError>> => {
  const startR = await beginLogin(stubRp())();
  return isOk(startR)
    ? run(startR.content)
    : err(transportError("no start"));
};

test("a transport error propagates as TransportError", async () => {
  const dead: RpTransport = async () =>
    err(transportError("network down"));
  const r = await withStart((start) =>
    completeLogin(stubRp(), dead)(
      { code: "c", state: start.state },
      start,
    ),
  );
  return check(kind(r), toBe("TransportError"));
});

test("a token response with no id_token is InvalidIdToken", async () => {
  const r = await withStart((start) =>
    completeLogin(
      stubRp(),
      okBody({ access_token: "x" }),
    )(
      { code: "c", state: start.state },
      start,
    ),
  );
  return check(kind(r), toBe("InvalidIdToken"));
});

test("a non-JWS id_token is InvalidIdToken", async () => {
  const r = await withStart((start) =>
    completeLogin(
      stubRp(),
      okBody({ id_token: "not-a-jws" }),
    )(
      { code: "c", state: start.state },
      start,
    ),
  );
  return check(kind(r), toBe("InvalidIdToken"));
});

test("a non-JSON token body is TokenExchangeFailed", async () => {
  const notJson: RpTransport = async () =>
    ok(textResponse("<<not json>>"));
  const r = await withStart((start) =>
    completeLogin(stubRp(), notJson)(
      { code: "c", state: start.state },
      start,
    ),
  );
  return check(kind(r), toBe("TokenExchangeFailed"));
});

test("a bytes token body is TokenExchangeFailed", async () => {
  const bytesBody: RpTransport = async () =>
    ok({
      status: statusOf(200),
      headers: {},
      body: box("Bytes")(
        new Uint8Array([1, 2, 3]),
      ),
    });
  const r = await withStart((start) =>
    completeLogin(stubRp(), bytesBody)(
      { code: "c", state: start.state },
      start,
    ),
  );
  return check(kind(r), toBe("TokenExchangeFailed"));
});

test("inProcessTransport maps an OP handler error to TransportError", async () => {
  const boom = get(
    "/boom",
    async () =>
      err(internalError("kaboom")),
  )(web());
  const r = await inProcessTransport(boom)(
    request("GET", `${ISSUER}/boom`),
  );
  return check(isErr(r), toBe(true));
});
