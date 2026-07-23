import {
  type Option,
  type SoftStr,
  type PromisedResult,
  ok,
  err,
  some,
  none,
  isErr,
  isNone,
  matchOption,
  matchResult,
} from "plgg";
import {
  type Web,
  type Context,
  type HttpResponse,
  type HttpError,
  web,
  post,
  jsonResponse,
  unauthorized,
  notFound,
  internalError,
} from "plggpress/framework";
import {
  type KeyMinter,
  type EphemeralKey,
} from "plgg-kit";
import { type RpSessionStore } from "plgg-cms/auth/rpSessionStore";
import { RP_SESSION_COOKIE } from "plgg-cms/auth/pressAuth";
import { getCookie } from "plggpress/framework";

const sessionSubject =
  (
    sessions: RpSessionStore,
    clock: () => number,
  ) =>
  async (
    c: Context,
  ): Promise<Option<SoftStr>> => {
    const cookie = getCookie(RP_SESSION_COOKIE)(
      c.req,
    );
    if (isNone(cookie)) {
      return none();
    }
    const found = await sessions.find(
      cookie.content,
    );
    if (isErr(found) || isNone(found.content)) {
      return none();
    }
    const session = found.content.content;
    return session.expiresAt <= clock()
      ? none()
      : some(session.subject);
  };

/**
 * The Realtime mint route (ticket 25, D12). `POST
 * /api/agent/session` — authenticated (RP session; anonymous →
 * 401) — mints a short-lived ephemeral key server-side and
 * returns it as JSON so the browser can open a Realtime
 * connection WITHOUT ever seeing the standing key. With no key
 * configured the {@link KeyMinter} is `None` and the route
 * answers 404 — the server half of "agent UI hidden with no
 * key". A mint failure (upstream down) is a 502, never a throw.
 */
export const agentWeb = (
  minter: Option<KeyMinter>,
  sessions: RpSessionStore,
  clock: () => number,
): Web =>
  post(
    "/session",
    (
      c: Context,
    ): PromisedResult<
      HttpResponse,
      HttpError
    > =>
      sessionSubject(sessions, clock)(c).then(
        matchOption<
          SoftStr,
          PromisedResult<
            HttpResponse,
            HttpError
          >
        >(
          () =>
            Promise.resolve(
              err(
                unauthorized(
                  "sign in to start a voice session",
                ),
              ),
            ),
          () =>
            matchOption<
              KeyMinter,
              PromisedResult<
                HttpResponse,
                HttpError
              >
            >(
              () =>
                Promise.resolve(
                  err(
                    notFound(
                      "voice agent is not configured",
                    ),
                  ),
                ),
              (m: KeyMinter) =>
                m.mint().then(
                  matchResult<
                    EphemeralKey,
                    unknown,
                    import("plgg").Result<
                      HttpResponse,
                      HttpError
                    >
                  >(
                    () =>
                      err(
                        internalError(
                          "could not mint a realtime key",
                        ),
                      ),
                    (key: EphemeralKey) =>
                      ok(
                        jsonResponse({
                          value: key.value,
                          expiresAt: key.expiresAt,
                        }),
                      ),
                  ),
                ),
            )(minter),
        ),
      ),
  )(web());
