import {
  type Option,
  type SoftStr,
  type PromisedResult,
  type InvalidError,
  type Defect,
  box,
  ok,
  err,
  none,
  isErr,
  isNone,
  pipe,
} from "plgg";
import {
  type Web,
  type Context,
  use,
  route,
} from "plgg-server";
import {
  type SetCookie,
  getCookie,
  sessionCookie,
  withPath,
  withMaxAge,
} from "plgg-http";
import { type SqlError } from "plgg-sql";
import {
  type Role,
  type AccountStore,
  roleOf,
  asSubject,
  freshOpaque,
} from "plgg-auth";
import {
  requireRole,
  requireCsrf,
} from "plgg-server";
import { type RpSessionStore } from "plgg-cms/auth/rpSessionStore";

/** The RP admin-session cookie (distinct from the OP SSO cookie). */
export const RP_SESSION_COOKIE = "plgg_rp_session";
/** The double-submit CSRF cookie + field for admin forms. */
export const CSRF_COOKIE = "plgg_csrf";
export const CSRF_FIELD = "csrf_token";
/** The RP session cookie is scoped to the admin subtree only. */
const ADMIN_PATH: SoftStr = "/admin";

type SessionError = SqlError | InvalidError | Defect;

/**
 * The RP session `Set-Cookie`: the opaque id on the
 * `sessionCookie` secure baseline (HttpOnly, Secure,
 * SameSite=Lax), scoped to `Path=/admin` and expiring with
 * the session. Carries ONLY the id — never the subject.
 */
const rpCookie = (
  id: SoftStr,
  ttlSeconds: number,
): SetCookie =>
  // A constant cookie name + a base64url opaque id are valid
  // by construction, so they go through the raw box
  // constructors — no caster branch.
  pipe(
    sessionCookie(
      box("CookieName")(RP_SESSION_COOKIE),
      box("CookieValue")(id),
    ),
    withPath(ADMIN_PATH),
    withMaxAge(ttlSeconds),
  );

/**
 * Mints a fresh opaque RP session for `subject`, persists it
 * (expiring `ttlSeconds` from `clock()`), and returns the
 * `Set-Cookie` to hand the browser. The callback route calls
 * this after a validated {@link completeLogin}. Never throws.
 */
export const establishRpSession =
  (
    sessions: RpSessionStore,
    clock: () => number,
    ttlSeconds: number,
  ) =>
  async (
    subject: SoftStr,
  ): PromisedResult<SetCookie, SessionError> => {
    const id = freshOpaque();
    const saved = await sessions.save({
      id,
      subject,
      expiresAt: clock() + ttlSeconds,
    });
    return isErr(saved)
      ? err(saved.content)
      : ok(rpCookie(id, ttlSeconds));
  };

/**
 * Resolves the admin principal's {@link Role} from the
 * request: read the RP session cookie → `find` the session →
 * reject if expired → look the subject's role up via
 * {@link roleOf}. `None` at every failure (no cookie, no
 * session, expired, store error) so the guard treats it as
 * unauthenticated — never a throw. This is the resolver
 * injected into plgg-server's auth-agnostic
 * {@link requireRole}, so the plggpress ↔ plgg-auth coupling
 * lives here, not in plgg-server.
 */
export const rpRoleResolver =
  (
    sessions: RpSessionStore,
    accounts: AccountStore,
    clock: () => number,
  ) =>
  async (
    c: Context,
  ): Promise<Option<Role>> => {
    const cookie = getCookie(RP_SESSION_COOKIE)(
      c.req,
    );
    if (isNone(cookie)) {
      return none();
    }
    const found = await sessions.find(
      cookie.content,
    );
    if (isErr(found)) {
      return none();
    }
    if (isNone(found.content)) {
      return none();
    }
    const session = found.content.content;
    if (session.expiresAt <= clock()) {
      return none();
    }
    const subject = asSubject(session.subject);
    if (isErr(subject)) {
      return none();
    }
    const role = await roleOf(accounts)(
      subject.content,
    );
    return isErr(role) ? none() : role.content;
  };

/**
 * Mounts `adminApp` under `/admin` behind the admin guards:
 * `requireRole(resolver, admin-only)` (401 unauthenticated /
 * 403 non-admin) plus `requireCsrf` on unsafe methods. Uses
 * plgg-server's `route`, which scopes these middlewares to
 * the `/admin` prefix, so reader routes are never touched.
 */
export const guardAdmin =
  (
    resolver: (
      c: Context,
    ) => Promise<Option<Role>>,
  ) =>
  (adminApp: Web): ((base: Web) => Web) =>
    route(
      "/admin",
      pipe(
        adminApp,
        use(
          requireRole(
            resolver,
            (r: Role) => r === "admin",
          ),
        ),
        use(
          requireCsrf(CSRF_COOKIE, CSRF_FIELD),
        ),
      ),
    );
