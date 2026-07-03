import {
  SoftStr,
  Dict,
  Option,
  Result,
  ok,
  isErr,
  isOk,
  isSome,
  pipe,
  none,
  fromNullable,
  matchOption,
} from "plgg";
import {
  RedirectUri,
  redirectUriString,
} from "plgg-auth/Oidc/model/Client";
import {
  PendingRequest,
  Session,
  liftStore,
} from "plgg-auth/Oidc/model/AuthStore";
import {
  asSessionId,
  freshPendingRequestId,
  pendingRequestIdString,
} from "plgg-auth/Oidc/model/Tokens";
import {
  AuthorizationRequest,
  State,
  stateString,
  parseAuthorizationRequest,
} from "plgg-auth/Oidc/model/AuthorizationRequest";
import {
  ProviderConfig,
  endpointUrl,
} from "plgg-auth/Oidc/model/ProviderConfig";
import {
  OidcError,
  oauthErrorCode,
} from "plgg-auth/Oidc/model/OidcError";
import { resolveRedirect } from "plgg-auth/Oidc/usecase/resolveClient";
import { completeAuthorization } from "plgg-auth/Oidc/usecase/completeAuthorization";

/**
 * What the `/authorize` handler must do next.
 * `LoginRequired` parks a pending request and
 * redirects to the app's login route;
 * `RedirectToClient` sends the browser back to
 * the RP (with a code on success, or an error on
 * a redirectable failure); `LocalError` is a
 * non-redirectable failure that must be rendered
 * on the OP itself (an unvalidated `redirect_uri`
 * must never receive a redirect).
 */
export type AuthorizeOutcome =
  | Readonly<{
      kind: "LoginRequired";
      location: SoftStr;
    }>
  | Readonly<{
      kind: "RedirectToClient";
      location: SoftStr;
    }>
  | Readonly<{
      kind: "LocalError";
      error: OidcError;
    }>;

const lookupOwn = (
  map: Dict<string, SoftStr>,
  name: SoftStr,
): Option<SoftStr> =>
  Object.prototype.hasOwnProperty.call(map, name)
    ? fromNullable(map[name])
    : none();

const appendParams = (
  base: SoftStr,
  params: ReadonlyArray<Param>,
): SoftStr => {
  const url = new URL(base);
  for (const [k, v] of params) {
    url.searchParams.set(k, v);
  }
  return url.toString();
};

type Param = readonly [string, string];

const stateParams = (
  state: Option<State>,
): ReadonlyArray<Param> =>
  matchOption(
    (): ReadonlyArray<Param> => [],
    (s: State): ReadonlyArray<Param> => [
      ["state", stateString(s)],
    ],
  )(state);

const successRedirect = (
  request: AuthorizationRequest,
  code: string,
): SoftStr =>
  appendParams(
    redirectUriString(request.redirectUri),
    [
      ["code", code],
      ...stateParams(request.state),
    ],
  );

const errorRedirect = (
  redirectUri: RedirectUri,
  rawState: Option<SoftStr>,
  error: OidcError,
): SoftStr =>
  appendParams(redirectUriString(redirectUri), [
    ["error", oauthErrorCode(error)],
    ["error_description", error.content.message],
    ...matchOption(
      (): ReadonlyArray<Param> => [],
      (s: SoftStr): ReadonlyArray<Param> => [
        ["state", s],
      ],
    )(rawState),
  ]);

const loginRedirect = (
  config: ProviderConfig,
  pendingId: SoftStr,
): SoftStr =>
  appendParams(
    endpointUrl(config, config.loginPath.content),
    [["request_id", pendingId]],
  );

/**
 * The `/authorize` orchestration, independent of
 * HTTP. Resolves and validates the client and
 * `redirect_uri` (failures are `LocalError`),
 * then parses the request (failures now redirect
 * back to the RP as an error). With a live
 * session it completes immediately and redirects
 * with a code; otherwise it parks a pending
 * request and returns `LoginRequired`.
 */
export const authorize =
  (config: ProviderConfig) =>
  (
    query: Dict<string, SoftStr>,
    sessionCookie: Option<SoftStr>,
  ) =>
  async (): Promise<AuthorizeOutcome> => {
    const resolved = await resolveRedirect(
      config.store,
    )(query);
    if (isErr(resolved)) {
      return {
        kind: "LocalError",
        error: resolved.content,
      };
    }
    const parsed = parseAuthorizationRequest(
      resolved.content.client.id,
      resolved.content.redirectUri,
    )(query);
    if (isErr(parsed)) {
      return {
        kind: "RedirectToClient",
        location: errorRedirect(
          resolved.content.redirectUri,
          lookupOwn(query, "state"),
          parsed.content,
        ),
      };
    }
    const request = parsed.content;
    const session = await resolveSession(
      config,
      sessionCookie,
    );
    return isOk(session) &&
      isSome(session.content)
      ? completeWithSession(
          config,
          request,
          session.content.content,
        )
      : parkAndLogin(config, request);
  };

const resolveSession = (
  config: ProviderConfig,
  sessionCookie: Option<SoftStr>,
): Promise<Result<Option<Session>, OidcError>> =>
  matchOption(
    (): Promise<
      Result<Option<Session>, OidcError>
    > => Promise.resolve(ok(none())),
    (raw: SoftStr) =>
      pipe(
        asSessionId(raw),
        (
          parsed,
        ): Promise<
          Result<Option<Session>, OidcError>
        > =>
          isErr(parsed)
            ? Promise.resolve(ok(none()))
            : liftStore(() =>
                config.store.findSession(
                  parsed.content,
                ),
              ),
      ),
  )(sessionCookie);

const completeWithSession = async (
  config: ProviderConfig,
  request: AuthorizationRequest,
  session: Session,
): Promise<AuthorizeOutcome> => {
  const now = config.clock();
  if (session.expiresAt <= now) {
    return parkAndLogin(config, request);
  }
  // A live session: park then immediately
  // complete, reusing the same seam the login
  // route calls.
  const pendingId = freshPendingRequestId();
  const pending: PendingRequest = {
    id: pendingId,
    request,
    expiresAt: now + config.pendingTtlSeconds,
  };
  const saved = await liftStore(() =>
    config.store.savePendingRequest(pending),
  );
  if (isErr(saved)) {
    return {
      kind: "LocalError",
      error: saved.content,
    };
  }
  const granted = await completeAuthorization(
    config,
  )(pendingId, session.subject)();
  return isErr(granted)
    ? {
        kind: "LocalError",
        error: granted.content,
      }
    : {
        kind: "RedirectToClient",
        location: successRedirect(
          request,
          granted.content.code.content,
        ),
      };
};

const parkAndLogin = async (
  config: ProviderConfig,
  request: AuthorizationRequest,
): Promise<AuthorizeOutcome> => {
  const pendingId = freshPendingRequestId();
  const pending: PendingRequest = {
    id: pendingId,
    request,
    expiresAt:
      config.clock() + config.pendingTtlSeconds,
  };
  const saved = await liftStore(() =>
    config.store.savePendingRequest(pending),
  );
  return isErr(saved)
    ? {
        kind: "LocalError",
        error: saved.content,
      }
    : {
        kind: "LoginRequired",
        location: loginRedirect(
          config,
          pendingRequestIdString(pendingId),
        ),
      };
};

/** Builds the RP success redirect (code + state) — the login route uses it after `completeAuthorization`. */
export const buildSuccessRedirect =
  successRedirect;

/** Builds the RP error redirect — exposed for handlers reporting a post-resolution failure. */
export const buildErrorRedirect = errorRedirect;
