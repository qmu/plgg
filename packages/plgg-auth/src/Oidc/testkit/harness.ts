import {
  Dict,
  Num,
  Option,
  Result,
  box,
  some,
  none,
  isOk,
} from "plgg";
import {
  HttpRequest,
  HttpResponse,
  HttpError,
  Method,
  web,
  get,
  handle,
  badRequest,
} from "plgg-server";
import { err } from "plgg";
import { RsaKeyPair } from "plgg-auth/Jose/usecase/generateRsaKey";
import {
  Client,
  ClientId,
  ClientSecretHash,
  RedirectUri,
} from "plgg-auth/Oidc/model/Client";
import { ProviderConfig } from "plgg-auth/Oidc/model/ProviderConfig";
import { Subject } from "plgg-auth/Oidc/model/Tokens";
import { AuthStore } from "plgg-auth/Oidc/model/AuthStore";
import {
  mountOidc,
  sessionRedirect,
  buildSuccessRedirect,
  completeAuthorization,
  asPendingRequestId,
} from "plgg-auth/index";
import { memoryStore } from "plgg-auth/Oidc/testkit/memoryStore";

/** Test-only total constructors over known-valid fixtures. */
export const clientId = (s: string): ClientId =>
  box("ClientId")(s);
export const redirectUri = (
  s: string,
): RedirectUri => box("RedirectUri")(s);
export const subject = (s: string): Subject =>
  box("Subject")(s);
export const secretHash = (
  s: string,
): ClientSecretHash => box("ClientSecretHash")(s);

export const ISSUER = "https://op.example";
export const RP_REDIRECT =
  "https://rp.example/cb";

/** A public (PKCE-only) demo client. */
export const publicClient: Client = {
  id: clientId("demo-rp"),
  secretHash: none(),
  redirectUris: [redirectUri(RP_REDIRECT)],
};

/** A mutable-clock provider config over an in-memory store. */
export const makeConfig = (
  keyPair: RsaKeyPair,
  clients: ReadonlyArray<Client>,
  clockBox: { now: Num },
): ProviderConfig => ({
  issuer: box("Str")(ISSUER),
  loginPath: box("Str")("/login"),
  store: memoryStore(
    clients,
    some(keyPair.privateKey),
  ),
  codeTtlSeconds: 60,
  accessTtlSeconds: 3600,
  idTokenTtlSeconds: 3600,
  sessionTtlSeconds: 86400,
  pendingTtlSeconds: 600,
  clock: () => clockBox.now,
});

/** Like {@link makeConfig} but with NO active signing key. */
export const makeConfigNoKey = (
  clients: ReadonlyArray<Client>,
  clockBox: { now: Num },
): ProviderConfig => ({
  issuer: box("Str")(ISSUER),
  loginPath: box("Str")("/login"),
  store: memoryStore(clients, none()),
  codeTtlSeconds: 60,
  accessTtlSeconds: 3600,
  idTokenTtlSeconds: 3600,
  sessionTtlSeconds: 86400,
  pendingTtlSeconds: 600,
  clock: () => clockBox.now,
});

/**
 * An {@link AuthStore} whose every operation
 * rejects — for exercising the `StoreFailure`
 * fold across the usecases.
 */
export const failingStore = (): AuthStore => {
  const boom = async (): Promise<never> => {
    throw new Error("store is down");
  };
  return {
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
  };
};

/** A config over the {@link failingStore}. */
export const makeConfigFailing = (clockBox: {
  now: Num;
}): ProviderConfig => ({
  issuer: box("Str")(ISSUER),
  loginPath: box("Str")("/login"),
  store: failingStore(),
  codeTtlSeconds: 60,
  accessTtlSeconds: 3600,
  idTokenTtlSeconds: 3600,
  sessionTtlSeconds: 86400,
  pendingTtlSeconds: 600,
  clock: () => clockBox.now,
});

/** Overrides specific store methods (e.g. to make one throw). */
export const overrideStore = (
  base: AuthStore,
  over: Partial<AuthStore>,
): AuthStore => ({ ...base, ...over });

/** A rejecting store method for `overrideStore`. */
export const boom = async (): Promise<never> => {
  throw new Error("store op failed");
};

/** A config over a caller-supplied store. */
export const makeConfigWithStore = (
  store: AuthStore,
  clockBox: { now: Num },
): ProviderConfig => ({
  issuer: box("Str")(ISSUER),
  loginPath: box("Str")("/login"),
  store,
  codeTtlSeconds: 60,
  accessTtlSeconds: 3600,
  idTokenTtlSeconds: 3600,
  sessionTtlSeconds: 86400,
  pendingTtlSeconds: 600,
  clock: () => clockBox.now,
});

/**
 * The OP app used by the specs: the mounted
 * endpoints plus a stub `/login` route that
 * authenticates `subjectFor` and completes the
 * authorization — the app-owned half of the
 * login seam.
 */
export const makeApp = (
  config: ProviderConfig,
  subjectFor: Subject,
) =>
  get(
    "/login",
    async (
      c,
    ): Promise<
      Result<HttpResponse, HttpError>
    > => {
      const parsed = asPendingRequestId(
        c.req.query["request_id"] ?? "",
      );
      if (!isOk(parsed)) {
        return err(badRequest("bad request_id"));
      }
      const granted = await completeAuthorization(
        config,
      )(parsed.content, subjectFor)();
      if (!isOk(granted)) {
        return err(
          badRequest(
            granted.content.content.message,
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
    },
  )(mountOidc(config)(web()));

const parseSearch = (
  search: string,
): Dict<string, string> =>
  Object.fromEntries(
    new URLSearchParams(search).entries(),
  );

/** Builds an HttpRequest for the in-process dispatcher. */
export const request = (
  method: Method,
  url: string,
  headers: Dict<string, string> = {},
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

/** Reads a response header as a plain string. */
export const headerOf = (
  response: HttpResponse,
  name: string,
): string =>
  Object.prototype.hasOwnProperty.call(
    response.headers,
    name,
  )
    ? (response.headers[name] ?? "")
    : "";

/** Parses a JSON response body. */
export const jsonBody = (
  response: HttpResponse,
): Readonly<Record<string, unknown>> =>
  typeof response.body === "string"
    ? JSON.parse(response.body)
    : {};

/** Runs a request against the app. */
export const run = (
  app: ReturnType<typeof makeApp>,
  req: HttpRequest,
): Promise<Result<HttpResponse, HttpError>> =>
  handle(app, req);

/** The `code` query param from a redirect Location. */
export const codeFrom = (
  location: string,
): Option<string> => {
  const c = new URL(location).searchParams.get(
    "code",
  );
  return c === null ? none() : some(c);
};

/** A query param from a URL. */
export const paramFrom = (
  location: string,
  name: string,
): Option<string> => {
  const v = new URL(location).searchParams.get(
    name,
  );
  return v === null ? none() : some(v);
};
