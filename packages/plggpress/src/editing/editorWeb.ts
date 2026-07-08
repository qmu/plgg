import {
  type Option,
  type SoftStr,
  type Num,
  type Result,
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
  asHighlighter,
} from "plggpress/framework";
import { renderToString } from "plgg-view";
import {
  parseBlocks,
  mdToHtml,
  renderOptions,
} from "plgg-md";
import {
  type Db,
  openDraft,
  autosave,
  submitDraft,
} from "plgg-content";
import { href } from "plggpress/Href/usecase/href";
import { type RpSessionStore } from "plggpress/auth/rpSessionStore";
import { RP_SESSION_COOKIE } from "plggpress/auth/pressAuth";

const EDIT_BASE = "/edit";
const CSRF_COOKIE = "plgg_edit_csrf";
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

/** Render a Markdown body to preview HTML (a parse error falls back to raw). */
const previewHtml = (body: SoftStr): string =>
  matchResult<
    ReadonlyArray<import("plgg-md").Block>,
    unknown,
    string
  >(
    () => `<pre>${esc(body)}</pre>`,
    (blocks) =>
      renderToString(
        mdToHtml(
          renderOptions(
            asHighlighter(),
            href("/"),
          ),
        )(blocks),
      ),
  )(parseBlocks(body));

const page = (body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Editor</title></head><body>${body}</body></html>`;

const editorForm = (token: SoftStr): string =>
  page(
    `<h1>Edit</h1><form method="post" action="${EDIT_BASE}"><input type="hidden" name="${CSRF_FIELD}" value="${esc(
      token,
    )}"><input type="hidden" name="draft_id"><label>Article path <input name="content_path"></label><label>Markdown <textarea name="body"></textarea></label><button type="submit" name="verb" value="preview">Preview</button><button type="submit" name="verb" value="open">Save draft</button><button type="submit" name="verb" value="autosave">Autosave</button><button type="submit" name="verb" value="submit">Submit</button></form>`,
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
          EDIT_BASE,
        ),
      )(htmlResponse(editorForm(token))),
    ),
  );
};

const idOf = (body: SoftStr): Option<Num> =>
  matchOption<SoftStr, Option<Num>>(
    () => none(),
    (raw: SoftStr) => some(Number(raw)),
  )(readField(body, "draft_id"));

/** Dispatch an editor POST for a signed-in guest. */
const dispatch = (
  draftDb: Db,
  clock: () => number,
  subject: SoftStr,
  body: SoftStr,
): PromisedResult<HttpResponse, HttpError> => {
  const text = getOr("")(readField(body, "body"));
  const verb = getOr("preview")(
    readField(body, "verb"),
  );
  return verb === "preview"
    ? Promise.resolve(
        ok(htmlResponse(page(previewHtml(text)))),
      )
    : verb === "open"
      ? openDraft(draftDb, clock)(
          getOr("untitled.md")(
            readField(body, "content_path"),
          ),
          subject,
          none(),
          text,
        ).then(
          matchResult<
            unknown,
            unknown,
            Result<HttpResponse, HttpError>
          >(
            () =>
              err(
                internalError(
                  "could not open draft",
                ),
              ),
            () => ok(redirectResponse(EDIT_BASE)),
          ),
        )
      : verb === "autosave" || verb === "submit"
        ? matchOption<
            Num,
            PromisedResult<
              HttpResponse,
              HttpError
            >
          >(
            () =>
              Promise.resolve(
                err(
                  badRequest("missing draft_id"),
                ),
              ),
            (id: Num) =>
              (verb === "autosave"
                ? autosave(draftDb, clock)(
                    id,
                    subject,
                    text,
                  )
                : submitDraft(draftDb, clock)(
                    id,
                    subject,
                  )
              ).then(
                matchResult<
                  unknown,
                  unknown,
                  Result<HttpResponse, HttpError>
                >(
                  () =>
                    err(
                      badRequest(
                        "not your draft",
                      ),
                    ),
                  () =>
                    ok(
                      redirectResponse(EDIT_BASE),
                    ),
                ),
              ),
          )(idOf(body))
        : Promise.resolve(
            err(badRequest("unknown verb")),
          );
};

/**
 * The guest browser editor (ticket 22): GET renders a textarea
 * + a CSRF cookie; POST (behind {@link requireCsrf}) resolves
 * the RP-session subject (anonymous → 401) and dispatches —
 * `preview` renders the Markdown live via plgg-md; `open`
 * creates a draft with its first revision; `autosave` appends
 * the owner's revision; `submit` hands it to an admin. Ownership
 * + lifecycle are enforced in the usecases. Never throws.
 */
export const editorWeb = (
  draftDb: Db,
  sessions: RpSessionStore,
  clock: () => number,
): Web =>
  post(
    "/",
    (
      c: Context,
    ): PromisedResult<HttpResponse, HttpError> =>
      sessionSubject(
        sessions,
        clock,
      )(c).then(
        matchOption<
          SoftStr,
          PromisedResult<HttpResponse, HttpError>
        >(
          () =>
            Promise.resolve(
              err(
                unauthorized("sign in to edit"),
              ),
            ),
          (subj: SoftStr) =>
            dispatch(
              draftDb,
              clock,
              subj,
              c.req.body,
            ),
        ),
      ),
  )(
    use(requireCsrf(CSRF_COOKIE, CSRF_FIELD))(
      get("/", () => renderForm())(web()),
    ),
  );
