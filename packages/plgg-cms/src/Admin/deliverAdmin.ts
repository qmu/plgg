import {
  type PromisedResult,
  type Result,
  type Option,
  type SoftStr,
  type InvalidError,
  ok,
  err,
  box,
  pipe,
  match,
  matchResult,
  matchOption,
  fromNullable,
  getOr,
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
  internalError,
  badRequest,
  withSetCookie,
  issueCsrfToken,
  csrfCookie,
  requireCsrf,
} from "plggpress/framework";
import { renderToString } from "plgg-view";
import {
  type Cmd,
  cmdEffect$,
  cmdBatch$,
  cmdNone$,
} from "plgg-view/client";
import {
  type ScheduledModel,
  type SchedulerMsg,
  type Scheduled,
  schedule,
  renderMode,
} from "plgg-ui";
import {
  type Db,
  type ConversationStatus,
  type ExportFs,
  type PublishOutcome,
  type AssetExportFs,
  type AssetStatus,
  asConversationStatus,
  changeStatus,
  publishDraft,
  publishAsset,
} from "plgg-content";
import {
  type Account,
  type AccountStore,
  type Role,
  type Subject,
  type MintedInvite,
  asSubject,
  subjectString,
  usernameString,
  createInvite,
  inviteTokenString,
} from "plgg-auth";
import { adminDeclaration } from "plgg-cms/Admin/adminDeclaration";
import { type SettingsStore } from "plgg-cms/Admin/settingsStore";

const ADMIN_BASE = "/admin";
const ACT_PATH = "/act";
const CSRF_COOKIE = "plgg_admin_csrf";
const CSRF_FIELD = "csrf_token";
const INVITE_TTL = 604800; // 7 days

/** Minimal HTML-text escape for interpolated data. */
const esc = (s: SoftStr): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Resolve a scheduled program's pending commands server-side
 * so the rendered scene reflects loaded data: run each
 * `CmdEffect`, feed its `Msg` through `update`, recurse (a
 * depth guard bounds a loop); flatten `CmdBatch`; stop on
 * `CmdNone`.
 */
const settle = (
  scheduled: Scheduled,
  model: ScheduledModel,
  cmd: Cmd<SchedulerMsg>,
  depth: number,
): Promise<ScheduledModel> =>
  depth > 8
    ? Promise.resolve(model)
    : match(cmd)(
        [
          cmdEffect$(),
          ({
            content,
          }: {
            content: () => Promise<SchedulerMsg>;
          }) =>
            content().then((msg) => {
              const [next, nextCmd] =
                scheduled.update(msg, model);
              return settle(
                scheduled,
                next,
                nextCmd,
                depth + 1,
              );
            }),
        ],
        [
          cmdBatch$(),
          ({
            content,
          }: {
            content: ReadonlyArray<
              Cmd<SchedulerMsg>
            >;
          }) =>
            content.reduce(
              (
                acc: Promise<ScheduledModel>,
                c: Cmd<SchedulerMsg>,
              ) =>
                acc.then((m) =>
                  settle(
                    scheduled,
                    m,
                    c,
                    depth + 1,
                  ),
                ),
              Promise.resolve(model),
            ),
        ],
        [
          cmdNone$(),
          () => Promise.resolve(model),
        ],
      );

const csrfField = (token: SoftStr): string =>
  `<input type="hidden" name="${CSRF_FIELD}" value="${esc(
    token,
  )}">`;

/** A POST form carrying the CSRF token and an action verb. */
const actForm = (
  token: SoftStr,
  verb: SoftStr,
  inner: string,
): string =>
  `<form method="post" action="${ADMIN_BASE}${ACT_PATH}">${csrfField(
    token,
  )}<input type="hidden" name="verb" value="${esc(
    verb,
  )}">${inner}</form>`;

/** The SSR control panel: role changes, an invite, the settings key. */
const controls = (
  members: ReadonlyArray<Account>,
  keyStatus: SoftStr,
  token: SoftStr,
): string =>
  `<section class="plgg-admin-actions"><h2>Members</h2>` +
  members
    .map((m: Account) => {
      const hidden = `<input type="hidden" name="subject" value="${esc(
        subjectString(m.subject),
      )}">`;
      return (
        `<div class="plgg-admin-member"><span>${esc(
          usernameString(m.username),
        )}</span>` +
        actForm(
          token,
          "grant-admin",
          `${hidden}<button type="submit">Make admin</button>`,
        ) +
        actForm(
          token,
          "make-guest",
          `${hidden}<button type="submit">Revoke to guest</button>`,
        ) +
        `</div>`
      );
    })
    .join("") +
  `<h2>Invite</h2>` +
  actForm(
    token,
    "create-invite",
    `<button type="submit">Mint a guest invite link</button>`,
  ) +
  `<h2>Settings</h2><p>LLM key: ${esc(
    keyStatus,
  )}</p>` +
  actForm(
    token,
    "set-llm-key",
    `<input type="password" name="key" placeholder="operator LLM API key"><button type="submit">Save key</button>`,
  ) +
  `</section>`;

/** Wrap a rendered admin body in a minimal HTML document. */
const page = (body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>plggpress admin</title></head><body>${body}</body></html>`;

/** Attach the freshly-issued CSRF cookie to a GET response, or fail closed. */
const withCsrf = (
  token: SoftStr,
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
          "could not set the CSRF cookie",
        ),
      ),
    (res: HttpResponse) => ok(res),
  )(
    withSetCookie(
      csrfCookie(
        box("CookieName")(CSRF_COOKIE),
        box("CookieValue")(token),
        ADMIN_BASE,
      ),
    )(response),
  );

/** Read one field from an x-www-form-urlencoded body. */
const formField = (
  body: SoftStr,
  name: SoftStr,
): Option<SoftStr> =>
  fromNullable(
    new URLSearchParams(body).get(name) ??
      undefined,
  );

const renderGet =
  (
    db: Db,
    accounts: AccountStore,
    settings: SettingsStore,
    stakeholderDb: Db,
    draftDb: Db,
    assetDb: Db,
  ) =>
  (
    c: Context,
  ): PromisedResult<HttpResponse, HttpError> => {
    const scheduled = schedule(
      adminDeclaration(
        db,
        accounts,
        stakeholderDb,
        draftDb,
        assetDb,
      ),
    );
    const [model0, cmd0] = scheduled.init({
      path: "/",
      search: new URLSearchParams(
        c.req.query,
      ).toString(),
    });
    const token = issueCsrfToken();
    return Promise.all([
      settle(scheduled, model0, cmd0, 0),
      accounts.listAccounts(),
    ]).then(([model, members]) =>
      withCsrf(
        token,
        htmlResponse(
          page(
            renderToString(
              renderMode("multiColumn")(
                scheduled.scene(model),
              ),
            ) +
              controls(
                members,
                settings.llmKeyStatus(),
                token,
              ),
          ),
        ),
      ),
    );
  };

const inviteShownOnce = (
  minted: MintedInvite,
): HttpResponse =>
  htmlResponse(
    page(
      `<section class="plgg-admin-invite"><h1>Invite link</h1><p>Copy this now — it is shown once and never again:</p><code>${esc(
        inviteTokenString(minted.token),
      )}</code><p><a href="${ADMIN_BASE}">Back to admin</a></p></section>`,
    ),
  );

const doInvite = (
  accounts: AccountStore,
  clock: () => number,
): PromisedResult<HttpResponse, HttpError> =>
  createInvite(accounts, clock)(
    "guest",
    INVITE_TTL,
  ).then(
    matchResult<
      MintedInvite,
      unknown,
      Result<HttpResponse, HttpError>
    >(
      () =>
        err(
          internalError(
            "could not mint an invite",
          ),
        ),
      (minted: MintedInvite) =>
        ok(inviteShownOnce(minted)),
    ),
  );

const doSetKey = (
  settings: SettingsStore,
  body: SoftStr,
): PromisedResult<HttpResponse, HttpError> =>
  matchOption<
    SoftStr,
    PromisedResult<HttpResponse, HttpError>
  >(
    () =>
      Promise.resolve(
        err(badRequest("missing key")),
      ),
    (key: SoftStr) =>
      settings.setLlmKey(key).then(
        matchResult<
          null,
          unknown,
          Result<HttpResponse, HttpError>
        >(
          () => err(badRequest("invalid key")),
          () => ok(redirectResponse(ADMIN_BASE)),
        ),
      ),
  )(formField(body, "key"));

const doRole = (
  accounts: AccountStore,
  body: SoftStr,
  role: Role,
): PromisedResult<HttpResponse, HttpError> =>
  matchOption<
    SoftStr,
    PromisedResult<HttpResponse, HttpError>
  >(
    () =>
      Promise.resolve(
        err(badRequest("missing subject")),
      ),
    (raw: SoftStr) =>
      matchResult<
        Subject,
        InvalidError,
        PromisedResult<HttpResponse, HttpError>
      >(
        () =>
          Promise.resolve(
            err(badRequest("bad subject")),
          ),
        (subject: Subject) =>
          accounts
            .setRole(subject, role)
            .then(() =>
              ok(redirectResponse(ADMIN_BASE)),
            ),
      )(asSubject(raw)),
  )(formField(body, "subject"));

const doStatus = (
  stakeholderDb: Db,
  clock: () => number,
  body: SoftStr,
): PromisedResult<HttpResponse, HttpError> =>
  matchOption<
    SoftStr,
    PromisedResult<HttpResponse, HttpError>
  >(
    () =>
      Promise.resolve(
        err(
          badRequest("missing conversation id"),
        ),
      ),
    (idRaw: SoftStr) =>
      matchResult<
        ConversationStatus,
        InvalidError,
        PromisedResult<HttpResponse, HttpError>
      >(
        () =>
          Promise.resolve(
            err(badRequest("bad status")),
          ),
        (status: ConversationStatus) =>
          changeStatus(stakeholderDb, clock)(
            Number(idRaw),
            status,
          ).then(
            matchResult<
              ConversationStatus,
              unknown,
              Result<HttpResponse, HttpError>
            >(
              () =>
                err(
                  badRequest(
                    "illegal transition",
                  ),
                ),
              () =>
                ok(
                  redirectResponse(ADMIN_BASE),
                ),
            ),
          ),
      )(
        asConversationStatus(
          getOr("open")(
            formField(body, "status"),
          ),
        ),
      ),
  )(formField(body, "conversation_id"));

const doPublish = (
  draftDb: Db,
  exportFs: ExportFs,
  clock: () => number,
  body: SoftStr,
): PromisedResult<HttpResponse, HttpError> =>
  matchOption<
    SoftStr,
    PromisedResult<HttpResponse, HttpError>
  >(
    () =>
      Promise.resolve(
        err(badRequest("missing draft id")),
      ),
    (idRaw: SoftStr) =>
      publishDraft(draftDb, exportFs, clock)(
        Number(idRaw),
      ).then(
        matchResult<
          PublishOutcome,
          unknown,
          Result<HttpResponse, HttpError>
        >(
          () =>
            err(badRequest("could not publish")),
          () =>
            ok(redirectResponse(ADMIN_BASE)),
        ),
      ),
  )(formField(body, "draft_id"));

const doPublishAsset = (
  assetDb: Db,
  assetFs: AssetExportFs,
  clock: () => number,
  body: SoftStr,
): PromisedResult<HttpResponse, HttpError> =>
  matchOption<
    SoftStr,
    PromisedResult<HttpResponse, HttpError>
  >(
    () =>
      Promise.resolve(
        err(badRequest("missing asset id")),
      ),
    (idRaw: SoftStr) =>
      publishAsset(assetDb, assetFs, clock)(
        Number(idRaw),
      ).then(
        matchResult<
          AssetStatus,
          unknown,
          Result<HttpResponse, HttpError>
        >(
          () =>
            err(
              badRequest(
                "could not publish asset",
              ),
            ),
          () =>
            ok(redirectResponse(ADMIN_BASE)),
        ),
      ),
  )(formField(body, "asset_id"));

const runAct =
  (
    accounts: AccountStore,
    settings: SettingsStore,
    clock: () => number,
    stakeholderDb: Db,
    draftDb: Db,
    exportFs: ExportFs,
    assetDb: Db,
    assetFs: AssetExportFs,
  ) =>
  (
    c: Context,
  ): PromisedResult<HttpResponse, HttpError> =>
    matchOption<
      SoftStr,
      PromisedResult<HttpResponse, HttpError>
    >(
      () =>
        Promise.resolve(
          err(badRequest("missing action verb")),
        ),
      (verb: SoftStr) =>
        verb === "create-invite"
          ? doInvite(accounts, clock)
          : verb === "set-llm-key"
            ? doSetKey(settings, c.req.body)
            : verb === "grant-admin"
              ? doRole(accounts, c.req.body, "admin")
              : verb === "make-guest"
                ? doRole(
                    accounts,
                    c.req.body,
                    "guest",
                  )
                : verb === "set-status"
                  ? doStatus(
                      stakeholderDb,
                      clock,
                      c.req.body,
                    )
                  : verb === "publish-draft"
                    ? doPublish(
                        draftDb,
                        exportFs,
                        clock,
                        c.req.body,
                      )
                    : verb === "publish-asset"
                      ? doPublishAsset(
                          assetDb,
                          assetFs,
                          clock,
                          c.req.body,
                        )
                      : Promise.resolve(
                          err(
                            badRequest(
                              "unknown action verb",
                            ),
                          ),
                        ),
    )(formField(c.req.body, "verb"));

/**
 * The admin UI served at `/admin` (D1/D10): each GET schedules
 * {@link adminDeclaration}, restores the scene from the URL,
 * settles its async sources, and renders it through the
 * multi-column renderer to HTML — the SAME declaration the
 * parity spec draws in both modes — plus an SSR control panel
 * (role changes, invite, settings key) whose POSTs carry a
 * double-submit CSRF token verified by {@link requireCsrf}.
 * Server-rendered (no client bundle): interaction is a form
 * POST that mutates then redirects. The invite plaintext is
 * shown ONCE in the response, never persisted or re-fetched.
 * Mounted under the auth-guarded `/admin` subtree.
 */
export const deliverAdmin = (
  db: Db,
  accounts: AccountStore,
  settings: SettingsStore,
  clock: () => number,
  stakeholderDb: Db,
  draftDb: Db,
  exportFs: ExportFs,
  assetDb: Db,
  assetFs: AssetExportFs,
): Web =>
  pipe(
    web(),
    get(
      "/",
      renderGet(
        db,
        accounts,
        settings,
        stakeholderDb,
        draftDb,
        assetDb,
      ),
    ),
    use(requireCsrf(CSRF_COOKIE, CSRF_FIELD)),
    post(
      ACT_PATH,
      runAct(
        accounts,
        settings,
        clock,
        stakeholderDb,
        draftDb,
        exportFs,
        assetDb,
        assetFs,
      ),
    ),
  );
