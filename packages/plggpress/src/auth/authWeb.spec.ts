import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import {
  type Result,
  type Dict,
  box,
  ok,
  none,
  matchResult,
} from "plgg";
import {
  type HttpRequest,
  type HttpResponse,
  type HttpError,
  type Method,
  web,
  get,
  handle,
} from "plgg-server";
import { jsonResponse } from "plgg-http";
import {
  type ProviderConfig,
  type RpConfig,
  type AuthStore,
  type AccountStore,
  jwks,
} from "plgg-auth";
import { memoryRpSessionStore } from "plggpress/auth/rpSessionStore";
import { rpRoleResolver } from "plggpress/auth/pressAuth";
import {
  type Authenticate,
  authWeb,
} from "plggpress/auth/authWeb";

const NOW = 1_700_000_000;

// The OP store is never exercised by the wiring paths tested
// here (the full OP round trip is proven in plgg-auth's
// roundTrip.spec); every method rejects if it ever is.
const boom = async (): Promise<never> => {
  throw new Error("OP store not exercised");
};
const throwingStore: AuthStore = {
  findClient: boom,
  savePendingRequest: boom,
  takePendingRequest: boom,
  saveSession: boom,
  findSession: boom,
  saveCode: boom,
  takeCode: boom,
  saveAccessGrant: boom,
  findAccessGrant: boom,
  activeSigningKey: boom,
  verificationJwks: boom,
  saveRefreshToken: boom,
  findRefreshToken: boom,
  setRefreshStatus: boom,
  revokeRefreshFamily: boom,
  saveSigningKey: boom,
  signingKeysByStatus: boom,
  transitionSigningKey: boom,
};

const stubAccounts: AccountStore = {
  findRole: async () => none(),
  setRole: async () => undefined,
  clearRole: async () => undefined,
  findAccountByUsername: async () => none(),
  saveAccount: async () => undefined,
  saveInvite: async () => undefined,
  takeInvite: async () => none(),
};

const config: ProviderConfig = {
  issuer: box("Str")("https://op.example"),
  loginPath: box("Str")("/auth/login"),
  store: throwingStore,
  codeTtlSeconds: 60,
  accessTtlSeconds: 3600,
  idTokenTtlSeconds: 3600,
  sessionTtlSeconds: 86400,
  pendingTtlSeconds: 600,
  refreshTtlSeconds: 1209600,
  clock: () => NOW,
};

const rpConfig: RpConfig = {
  clientId: box("ClientId")("demo-rp"),
  redirectUri: box("RedirectUri")(
    "https://rp.example/callback",
  ),
  issuer: box("Str")("https://op.example"),
  authorizePath: "/authorize",
  tokenPath: "/token",
  scope: "openid",
  audience: box("Str")("demo-rp"),
  clock: () => NOW,
  leewaySeconds: 5,
  verificationJwks: async () => jwks([]),
};

const stubAuthenticate: Authenticate = async () =>
  ok(none());

const app = (): ReturnType<typeof web> =>
  authWeb(
    config,
    rpConfig,
    memoryRpSessionStore(),
    () => NOW,
    3600,
    stubAuthenticate,
    rpRoleResolver(
      memoryRpSessionStore(),
      stubAccounts,
      () => NOW,
    ),
    get("/", async () =>
      ok(jsonResponse({ ok: true })),
    )(web()),
  );

const req = (
  method: Method,
  path: string,
  headers: Dict<string, string> = {},
): HttpRequest => ({
  method,
  path,
  query: {},
  headers,
  params: {},
  body: "",
  bytes: none(),
});

const outcome = (
  r: Result<HttpResponse, HttpError>,
): string =>
  matchResult<HttpResponse, HttpError, string>(
    (e: HttpError) => e.__tag,
    (res: HttpResponse) =>
      String(res.status.content),
  )(r);

test("GET /auth/start redirects to the OP with a pending cookie", async () => {
  const r = await handle(
    app(),
    req("GET", "/auth/start"),
  );
  return matchResult<
    HttpResponse,
    HttpError,
    ReturnType<typeof all>
  >(
    () => check("err", toBe("ok")),
    (res: HttpResponse) =>
      all([
        check(res.status.content, toBe(302)),
        check(
          res.headers["location"] ?? "",
          toContain("code_challenge_method=S256"),
        ),
        check(
          res.headers["set-cookie"] ?? "",
          toContain("plgg_rp_pending"),
        ),
      ]),
  )(r);
});

test("GET /auth/callback without a pending cookie is 400", async () =>
  check(
    outcome(
      await handle(
        app(),
        req("GET", "/auth/callback"),
      ),
    ),
    toBe("BadRequest"),
  ));

test("GET /admin without a session is 401 (guard wired through authWeb)", async () =>
  check(
    outcome(
      await handle(app(), req("GET", "/admin")),
    ),
    toBe("Unauthorized"),
  ));
