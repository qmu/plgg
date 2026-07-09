import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  type Dict,
  isErr,
  none,
  matchResult,
} from "plgg";
import {
  type HttpRequest,
  type HttpResponse,
  type HttpError,
  type Method,
  handle,
} from "plgg-server";
import {
  type Db,
  openDraftStore,
  sqlDraftStore,
} from "plgg-cms/content";
import { memoryRpSessionStore } from "plgg-cms/auth/rpSessionStore";
import { editorWeb } from "plgg-cms/editing/editorWeb";

const NOW = 1_700_000_000;
const clock = () => NOW;

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const setup = async (): Promise<{
  db: Db;
  app: ReturnType<typeof editorWeb>;
}> => {
  const db = must(
    await openDraftStore(":memory:"),
  );
  const sessions = memoryRpSessionStore();
  must(
    await sessions.save({
      id: "sess-1",
      subject: "guest-9",
      expiresAt: NOW + 3600,
    }),
  );
  return { db, app: editorWeb(db, sessions, clock) };
};

const req = (
  method: Method,
  headers: Dict<string, string> = {},
  body = "",
): HttpRequest => ({
  method,
  path: "/",
  query: {},
  headers,
  params: {},
  body,
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

const csrfFrom = (res: HttpResponse): string => {
  const m = /plgg_edit_csrf=([^;]+)/.exec(
    res.headers["set-cookie"] ?? "",
  );
  return m === null ? "" : m[1] ?? "";
};

test("GET renders the editor form and sets a CSRF cookie", async () => {
  const { app } = await setup();
  const res = must(await handle(app, req("GET")));
  return all([
    check(res.status.content, toBe(200)),
    check(
      String(res.body).includes("<textarea"),
      toBe(true),
    ),
    check(csrfFrom(res).length > 0, toBe(true)),
  ]);
});

const post = async (
  body: string,
  opts: { session?: boolean; csrf?: boolean },
) => {
  const { db, app } = await setup();
  const token = csrfFrom(
    must(await handle(app, req("GET"))),
  );
  const cookie =
    opts.session === false
      ? `plgg_edit_csrf=${token}`
      : `plgg_edit_csrf=${token}; plgg_rp_session=sess-1`;
  const csrf =
    opts.csrf === false ? "" : `csrf_token=${token}&`;
  const res = await handle(
    app,
    req(
      "POST",
      {
        cookie,
        "content-type":
          "application/x-www-form-urlencoded",
      },
      `${csrf}${body}`,
    ),
  );
  return { db, res };
};

test("preview renders the Markdown body to HTML", async () => {
  const { res } = await post(
    "verb=preview&body=%23%20Hello",
    {},
  );
  const html = String(must(res).body);
  return all([
    check(must(res).status.content, toBe(200)),
    check(html.includes("Hello"), toBe(true)),
  ]);
});

test("open creates a draft with its first revision and redirects", async () => {
  const { db, res } = await post(
    "verb=open&content_path=blog/new.md&body=draft+text",
    {},
  );
  const drafts = must(
    await sqlDraftStore(db).listDrafts({
      createdBy: none(),
      status: none(),
    }),
  );
  return all([
    check(outcome(res), toBe("302")),
    check(drafts.length, toBe(1)),
    check(
      drafts[0]?.createdBy ?? "",
      toBe("guest-9"),
    ),
  ]);
});

test("an anonymous edit is 401 and a CSRF-less edit is 403", async () => {
  const anon = await post("verb=preview&body=x", {
    session: false,
  });
  const noCsrf = await post(
    "verb=preview&body=x",
    { csrf: false },
  );
  return all([
    check(outcome(anon.res), toBe("Unauthorized")),
    check(outcome(noCsrf.res), toBe("Forbidden")),
  ]);
});

test("autosave without a draft_id is 400", async () => {
  const { res } = await post(
    "verb=autosave&body=x",
    {},
  );
  return check(outcome(res), toBe("BadRequest"));
});
