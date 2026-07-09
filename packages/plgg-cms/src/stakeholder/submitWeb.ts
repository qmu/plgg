import {
  type Option,
  type SoftStr,
  type Result,
  type InvalidError,
  type PromisedResult,
  ok,
  err,
  box,
  some,
  none,
  isErr,
  isNone,
  getOr,
  matchResult,
  matchOption,
  fromNullable,
} from "plgg";
import {
  type Web,
  type Context,
  type HttpResponse,
  type HttpError,
  web,
  get,
  post,
  use,
  htmlResponse,
  redirectResponse,
  unauthorized,
  badRequest,
  internalError,
  getCookie,
  issueCsrfToken,
  csrfCookie,
  requireCsrf,
  withSetCookie,
} from "plggpress/framework";
import {
  type Db,
  type ConversationKind,
  type Message,
  ingest,
  ingestMessage,
  newConversation,
  asConversationKind,
} from "plgg-cms/content";
import { type RpSessionStore } from "plgg-cms/auth/rpSessionStore";
import { RP_SESSION_COOKIE } from "plgg-cms/auth/pressAuth";

const SUBMIT_BASE = "/requests";
const CSRF_COOKIE = "plgg_submit_csrf";
const CSRF_FIELD = "csrf_token";

const esc = (s: SoftStr): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Resolve the RP session cookie to its subject, if live. */
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

const readField = (
  body: SoftStr,
  name: SoftStr,
): Option<SoftStr> =>
  fromNullable(
    new URLSearchParams(body).get(name) ??
      undefined,
  );

/** Ingest a signed-in stakeholder's submission into a new public conversation. */
const doSubmit = (
  db: Db,
  clock: () => number,
  subject: SoftStr,
  reqBody: SoftStr,
): PromisedResult<HttpResponse, HttpError> =>
  matchOption<
    SoftStr,
    PromisedResult<HttpResponse, HttpError>
  >(
    () =>
      Promise.resolve(
        err(
          badRequest(
            "a message body is required",
          ),
        ),
      ),
    (bodyText: SoftStr) =>
      matchResult<
        ConversationKind,
        InvalidError,
        PromisedResult<HttpResponse, HttpError>
      >(
        () =>
          Promise.resolve(
            err(badRequest("unknown kind")),
          ),
        (kind: ConversationKind) =>
          ingest(db, clock)(
            ingestMessage({
              conversationRef: newConversation({
                contentPath: readField(
                  reqBody,
                  "content_path",
                ),
                kind,
                visibility: "public",
              }),
              body: bodyText,
              authorKind: "guest",
              authorSubject: some(subject),
              source: "web",
            }),
          ).then(
            matchResult<
              Message,
              unknown,
              Result<HttpResponse, HttpError>
            >(
              () =>
                err(
                  internalError(
                    "could not submit",
                  ),
                ),
              () =>
                ok(
                  redirectResponse(SUBMIT_BASE),
                ),
            ),
          ),
      )(
        asConversationKind(
          getOr("request")(
            readField(reqBody, "kind"),
          ),
        ),
      ),
  )(readField(reqBody, "body"));

const page = (body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Submit a request</title></head><body>${body}</body></html>`;

const form = (token: SoftStr): string =>
  page(
    `<h1>Submit a request or comment</h1><form method="post" action="${SUBMIT_BASE}"><input type="hidden" name="${CSRF_FIELD}" value="${esc(
      token,
    )}"><label>Article path <input name="content_path"></label><label>Kind <select name="kind"><option value="request">request</option><option value="comment">comment</option></select></label><label>Message <textarea name="body" required></textarea></label><button type="submit">Submit</button></form>`,
  );

const renderForm = (): PromisedResult<
  HttpResponse,
  HttpError
> => {
  const token = issueCsrfToken();
  return Promise.resolve(
    matchResult<
      HttpResponse,
      unknown,
      Result<HttpResponse, HttpError>
    >(
      () =>
        err(
          internalError(
            "could not set the CSRF cookie",
          ),
        ),
      (res: HttpResponse) => ok(res),
    )(
      withSetCookie(
        csrfCookie(
          box("CookieName")(CSRF_COOKIE),
          box("CookieValue")(token),
          SUBMIT_BASE,
        ),
      )(htmlResponse(form(token))),
    ),
  );
};

/**
 * The guest submission surface (D4): a signed-in stakeholder
 * POSTs a request/comment, which lands in the DB-PRIMARY store
 * through the ingestion contract ({@link ingest}). GET renders
 * a form and sets a double-submit CSRF cookie; POST verifies
 * CSRF ({@link requireCsrf}), resolves the RP-session subject
 * (anonymous → 401), and opens a NEW public conversation with
 * the message. `body` is stored verbatim (untrusted; the
 * reader escapes). Never throws.
 */
export const submitWeb = (
  db: Db,
  sessions: RpSessionStore,
  clock: () => number,
): Web =>
  post(
    "/",
    (
      c: Context,
    ): PromisedResult<HttpResponse, HttpError> =>
      sessionSubject(sessions, clock)(c).then(
        matchOption<
          SoftStr,
          PromisedResult<HttpResponse, HttpError>
        >(
          () =>
            Promise.resolve(
              err(
                unauthorized(
                  "sign in to submit",
                ),
              ),
            ),
          (subj: SoftStr) =>
            doSubmit(db, clock, subj, c.req.body),
        ),
      ),
  )(
    use(requireCsrf(CSRF_COOKIE, CSRF_FIELD))(
      get("/", () => renderForm())(web()),
    ),
  );
