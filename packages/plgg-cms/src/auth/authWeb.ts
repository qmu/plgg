import {
  type Option,
  type SoftStr,
  type Result,
  type PromisedResult,
  box,
  ok,
  err,
  pipe,
  isErr,
  isNone,
  fromNullable,
  matchOption,
  matchResult,
} from "plgg";
import {
  type Web,
  type Context,
  type Handler,
  type HttpResponse,
  type HttpError,
  web,
  get,
  post,
  handle,
} from "plgg-server";
import {
  type SetCookie,
  redirectResponse,
  withSetCookie,
  sessionCookie,
  withPath,
  getCookie,
  badRequest,
  unauthorized,
  internalError,
} from "plgg-http";
import {
  type ProviderConfig,
  type Subject,
  type Role,
  type RpConfig,
  type RpTransport,
  type RpError,
  type LoginStart,
  mountOidc,
  completeAuthorization,
  sessionRedirect,
  buildSuccessRedirect,
  asPendingRequestId,
  beginLogin,
  completeLogin,
  transportError,
  freshOpaque,
} from "plgg-auth";
import { type RpSessionStore } from "plgg-cms/auth/rpSessionStore";
import {
  establishRpSession,
  guardAdmin,
} from "plgg-cms/auth/pressAuth";

/** The short-lived cookie carrying the pending-login stash id (Path=/auth). */
const RP_PENDING_COOKIE = "plgg_rp_pending";

/**
 * The credential check the OP login route delegates to —
 * injected so this module never binds a specific account
 * store: the live server passes `authenticate(accounts)`
 * (ticket 18), tests pass a stub.
 */
export type Authenticate = (
  username: string,
  password: string,
) => Promise<Result<Option<Subject>, unknown>>;

/** A cookie built from constant/opaque-safe values (no caster branch). */
const opaqueCookie = (
  name: SoftStr,
  value: SoftStr,
  path: SoftStr,
): SetCookie =>
  withPath(path)(
    sessionCookie(
      box("CookieName")(name),
      box("CookieValue")(value),
    ),
  );

const setCookieOr500 = (
  cookie: SetCookie,
  response: HttpResponse,
): Result<HttpResponse, HttpError> =>
  matchResult<
    HttpResponse,
    unknown,
    Result<HttpResponse, HttpError>
  >(
    () =>
      err(
        internalError(
          "failed to serialize cookie",
        ),
      ),
    (r: HttpResponse) => ok(r),
  )(withSetCookie(cookie)(response));

/**
 * The OP's app-owned login route (POST): authenticate the
 * submitted credentials, then complete the pending
 * authorization and redirect back to the RP with the code —
 * the ticket-18 `authenticate` filling plgg-auth's
 * "the provider never sees a password" seam.
 */
const opLogin =
  (
    config: ProviderConfig,
    authenticate: Authenticate,
  ): Handler =>
  (
    c: Context,
  ): PromisedResult<HttpResponse, HttpError> => {
    const pendingId = asPendingRequestId(
      c.req.query["request_id"] ?? "",
    );
    if (isErr(pendingId)) {
      return Promise.resolve(
        err(badRequest("bad request_id")),
      );
    }
    const form = new URLSearchParams(c.req.body);
    return authenticate(
      form.get("username") ?? "",
      form.get("password") ?? "",
    ).then((authed) =>
      isErr(authed)
        ? err(
            internalError("authentication error"),
          )
        : matchOption<
            Subject,
            PromisedResult<
              HttpResponse,
              HttpError
            >
          >(
            () =>
              Promise.resolve(
                err(
                  unauthorized(
                    "invalid credentials",
                  ),
                ),
              ),
            (subject: Subject) =>
              completeAuthorization(config)(
                pendingId.content,
                subject,
              )().then((granted) =>
                isErr(granted)
                  ? err(
                      badRequest(
                        granted.content.content
                          .message,
                      ),
                    )
                  : sessionRedirect(
                      config,
                      buildSuccessRedirect(
                        granted.content.pending
                          .request,
                        granted.content.code
                          .content,
                      ),
                      granted.content.session
                        .content,
                    ),
              ),
          )(authed.content),
    );
  };

/** RP `/auth/start`: begin PKCE, stash it, redirect to the OP. */
const startHandler =
  (
    rpConfig: RpConfig,
    pending: Map<string, LoginStart>,
  ): Handler =>
  (): PromisedResult<HttpResponse, HttpError> =>
    beginLogin(rpConfig)().then((start) => {
      if (isErr(start)) {
        return err(
          internalError("could not begin login"),
        );
      }
      const id = freshOpaque();
      pending.set(id, start.content);
      return setCookieOr500(
        opaqueCookie(
          RP_PENDING_COOKIE,
          id,
          "/auth",
        ),
        redirectResponse(
          start.content.authorizeUrl,
        ),
      );
    });

/** RP `/auth/callback`: recover the stash, complete login, open an admin session. */
const callbackHandler =
  (
    rpConfig: RpConfig,
    transport: RpTransport,
    pending: Map<string, LoginStart>,
    sessions: RpSessionStore,
    clock: () => number,
    ttlSeconds: number,
  ): Handler =>
  (
    c: Context,
  ): PromisedResult<HttpResponse, HttpError> =>
    matchOption<
      SoftStr,
      PromisedResult<HttpResponse, HttpError>
    >(
      () =>
        Promise.resolve(
          err(badRequest("no pending login")),
        ),
      (id: SoftStr) => {
        const stashed = fromNullable(
          pending.get(id),
        );
        pending.delete(id);
        return isNone(stashed)
          ? Promise.resolve(
              err(
                badRequest("unknown pending login"),
              ),
            )
          : completeLogin(rpConfig, transport)(
              c.req.query,
              stashed.content,
            ).then((result) =>
              isErr(result)
                ? err(unauthorized("login failed"))
                : establishRpSession(
                    sessions,
                    clock,
                    ttlSeconds,
                  )(
                    result.content.subject.content,
                  ).then((est) =>
                    isErr(est)
                      ? err(
                          internalError(
                            "could not open session",
                          ),
                        )
                      : setCookieOr500(
                          est.content,
                          redirectResponse("/admin"),
                        ),
                  ),
            );
      },
    )(getCookie(RP_PENDING_COOKIE)(c.req));

/**
 * The full dogfooded OP+RP admin auth Web: the OIDC provider
 * (`mountOidc` + the credential login route), the RP
 * `/auth/start` + `/auth/callback` driving a login against
 * that same in-process provider, and the guarded `/admin`
 * subtree — all composed at the plgg-server routing level so
 * this drops onto the `pressServeWeb` seam via `route`.
 * `authenticate` and `roleResolver` are injected (the store
 * coupling stays at the wiring edge). Reader routes untouched.
 */
export const authWeb = (
  config: ProviderConfig,
  rpConfig: RpConfig,
  sessions: RpSessionStore,
  clock: () => number,
  ttlSeconds: number,
  authenticate: Authenticate,
  roleResolver: (
    c: Context,
  ) => Promise<Option<Role>>,
  adminApp: Web,
): Web => {
  const pending = new Map<string, LoginStart>();
  const op = post(
    config.loginPath.content,
    opLogin(config, authenticate),
  )(mountOidc(config)(web()));
  // The in-process transport: the dogfooded RP talks to the
  // OP in the SAME process, so its token exchange is a
  // handle() call, not a socket — an OP handler error folds
  // to a transportError.
  const transport: RpTransport = (req) =>
    handle(op, req).then(
      matchResult<
        HttpResponse,
        HttpError,
        Result<HttpResponse, RpError>
      >(
        (e: HttpError) =>
          err(
            transportError(
              `in-process OP error: ${e.__tag}`,
            ),
          ),
        (res: HttpResponse) => ok(res),
      ),
    );
  return pipe(
    op,
    get(
      "/auth/start",
      startHandler(rpConfig, pending),
    ),
    get(
      "/auth/callback",
      callbackHandler(
        rpConfig,
        transport,
        pending,
        sessions,
        clock,
        ttlSeconds,
      ),
    ),
    guardAdmin(roleResolver)(adminApp),
  );
};
