import { createHash } from "node:crypto";
import {
  type Option,
  type SoftStr,
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
  jsonResponse,
  bytesResponse,
  unauthorized,
  badRequest,
  internalError,
  notFound,
  param,
  getCookie,
  issueCsrfToken,
  csrfCookie,
  requireCsrf,
  withSetCookie,
} from "plggpress/framework";
import {
  type Db,
  type Asset,
  uploadAsset,
} from "plgg-cms/content";
import { sqlAssetStore } from "plgg-cms/content";
import { type RpSessionStore } from "plgg-cms/auth/rpSessionStore";
import { RP_SESSION_COOKIE } from "plgg-cms/auth/pressAuth";

const MEDIA_BASE = "/media";
const CSRF_COOKIE = "plgg_media_csrf";
const CSRF_FIELD = "csrf_token";

const esc = (s: SoftStr): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

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

/** Upload the raw request body as a content-addressed asset. */
const doUpload = (
  db: Db,
  clock: () => number,
  subject: SoftStr,
  c: Context,
): PromisedResult<HttpResponse, HttpError> =>
  matchOption<
    Uint8Array,
    PromisedResult<HttpResponse, HttpError>
  >(
    () =>
      Promise.resolve(
        err(badRequest("no upload body")),
      ),
    (bytes: Uint8Array) => {
      const hash = createHash("sha256")
        .update(bytes)
        .digest("hex");
      const bytesB64 =
        Buffer.from(bytes).toString("base64");
      return uploadAsset(db, clock)({
        contentPath: getOr("")(
          fromNullable(c.req.query["path"]),
        ),
        mime: getOr("application/octet-stream")(
          fromNullable(
            c.req.headers["content-type"],
          ),
        ),
        size: bytes.length,
        hash,
        bytesB64,
        createdBy: subject,
      }).then(
        matchResult<
          Asset,
          { content: { message: string } },
          import("plgg").Result<
            HttpResponse,
            HttpError
          >
        >(
          (e) =>
            err(
              badRequest(
                `upload rejected: ${e.content.message}`,
              ),
            ),
          (a: Asset) =>
            ok(
              jsonResponse({
                id: a.id,
                hash: a.hash,
                status: a.status,
              }),
            ),
        ),
      );
    },
  )(c.req.bytes);

/** Serve a stored asset's bytes with its recorded MIME type. */
const doServe = (
  db: Db,
  c: Context,
): PromisedResult<HttpResponse, HttpError> => {
  const id = Number(getOr("0")(param("id")(c)));
  const store = sqlAssetStore(db);
  return store.findAsset(id).then((found) =>
    matchResult<
      Option<Asset>,
      unknown,
      PromisedResult<HttpResponse, HttpError>
    >(
      () =>
        Promise.resolve(
          err(internalError("lookup failed")),
        ),
      (opt: Option<Asset>) =>
        matchOption<
          Asset,
          PromisedResult<HttpResponse, HttpError>
        >(
          () =>
            Promise.resolve(
              err(notFound("no such asset")),
            ),
          (a: Asset) =>
            store.loadBytes(id).then(
              matchResult<
                Option<SoftStr>,
                unknown,
                import("plgg").Result<
                  HttpResponse,
                  HttpError
                >
              >(
                () =>
                  err(
                    internalError(
                      "bytes load failed",
                    ),
                  ),
                (bytes: Option<SoftStr>) =>
                  matchOption<
                    SoftStr,
                    import("plgg").Result<
                      HttpResponse,
                      HttpError
                    >
                  >(
                    () =>
                      err(
                        notFound("no bytes"),
                      ),
                    (b64: SoftStr) =>
                      ok(
                        bytesResponse(
                          new Uint8Array(
                            Buffer.from(
                              b64,
                              "base64",
                            ),
                          ),
                          undefined,
                          {
                            "content-type": a.mime,
                          },
                        ),
                      ),
                  )(bytes),
              ),
            ),
        )(opt),
    )(found),
  );
};

const page = (body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Upload media</title></head><body>${body}</body></html>`;

const uploadForm = (
  token: SoftStr,
): string =>
  page(
    `<h1>Upload media</h1><p>POST the raw file bytes to <code>${MEDIA_BASE}/upload?path=assets/&lt;name&gt;</code> with the <code>X-CSRF-Token: ${esc(
      token,
    )}</code> header and your session cookie. Allowed: png/jpeg/gif/webp/pdf, up to 10 MiB.</p>`,
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
      import("plgg").Result<HttpResponse, HttpError>
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
          MEDIA_BASE,
        ),
      )(htmlResponse(uploadForm(token))),
    ),
  );
};

/**
 * The media surface (ticket 23): `GET /new` renders upload
 * instructions + a double-submit CSRF cookie; `POST /upload`
 * (behind {@link requireCsrf}, which accepts the token in the
 * `X-CSRF-Token` header so the raw file body is untouched)
 * resolves the RP-session subject (anonymous → 401), sha256s
 * the bytes, and stores a content-addressed asset via
 * {@link uploadAsset}; `GET /item/:id` serves an asset's bytes
 * with its recorded MIME. Never throws.
 */
export const mediaWeb = (
  assetDb: Db,
  sessions: RpSessionStore,
  clock: () => number,
): Web => {
  const uploads = post(
    "/upload",
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
                  "sign in to upload",
                ),
              ),
            ),
          (subj: SoftStr) =>
            doUpload(assetDb, clock, subj, c),
        ),
      ),
  )(
    use(requireCsrf(CSRF_COOKIE, CSRF_FIELD))(
      get("/new", () => renderForm())(web()),
    ),
  );
  return get(
    "/item/:id",
    (c: Context) => doServe(assetDb, c),
  )(uploads);
};
