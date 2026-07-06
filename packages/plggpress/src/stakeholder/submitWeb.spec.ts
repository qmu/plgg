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
  type StakeholderStore,
  openStakeholderStore,
  sqlStakeholderStore,
} from "plgg-content";
import { memoryRpSessionStore } from "plggpress/auth/rpSessionStore";
import { submitWeb } from "plggpress/stakeholder/submitWeb";

const NOW = 1_700_000_000;
const clock = () => NOW;

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const setup = async (): Promise<{
  store: StakeholderStore;
  app: ReturnType<typeof submitWeb>;
}> => {
  const db = must(
    await openStakeholderStore(":memory:"),
  );
  const sessions = memoryRpSessionStore();
  must(
    await sessions.save({
      id: "sess-1",
      subject: "user-9",
      expiresAt: NOW + 3600,
    }),
  );
  return {
    store: sqlStakeholderStore(db),
    app: submitWeb(db, sessions, clock),
  };
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
  const m = /plgg_submit_csrf=([^;]+)/.exec(
    res.headers["set-cookie"] ?? "",
  );
  return m === null ? "" : m[1] ?? "";
};

test("GET renders the submission form and sets a CSRF cookie", async () => {
  const { app } = await setup();
  const res = must(
    await handle(app, req("GET")),
  );
  return all([
    check(res.status.content, toBe(200)),
    check(
      String(res.body).includes(
        "Submit a request",
      ),
      toBe(true),
    ),
    check(csrfFrom(res).length > 0, toBe(true)),
  ]);
});

const drive = async (
  body: string,
  opts: {
    withSession?: boolean;
    withCsrf?: boolean;
  },
): Promise<{
  store: StakeholderStore;
  res: Result<HttpResponse, HttpError>;
}> => {
  const { store, app } = await setup();
  const token = csrfFrom(
    must(await handle(app, req("GET"))),
  );
  const cookie =
    opts.withSession === true
      ? `plgg_submit_csrf=${token}; plgg_rp_session=sess-1`
      : `plgg_submit_csrf=${token}`;
  const csrf =
    opts.withCsrf === false
      ? ""
      : `csrf_token=${token}&`;
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
  return { store, res };
};

test("a signed-in submission ingests a new public conversation and redirects", async () => {
  const { store, res } = await drive(
    "kind=request&content_path=blog/x.md&body=please+fix+the+typo",
    { withSession: true },
  );
  const convs = must(
    await store.listConversations({
      status: none(),
      contentPath: none(),
    }),
  );
  return all([
    check(outcome(res), toBe("302")),
    check(convs.length, toBe(1)),
    check(
      convs[0]?.visibility ?? "",
      toBe("public"),
    ),
    check(
      convs[0]?.createdBy?.__tag ?? "",
      toBe("Some"),
    ),
  ]);
});

test("an anonymous submission (no session) is 401", async () => {
  const { res } = await drive("body=hi", {
    withSession: false,
  });
  return check(outcome(res), toBe("Unauthorized"));
});

test("a submission without the CSRF token is 403", async () => {
  const { res } = await drive("body=hi", {
    withSession: true,
    withCsrf: false,
  });
  return check(outcome(res), toBe("Forbidden"));
});

test("a submission with no message body is 400", async () => {
  const { res } = await drive("kind=request", {
    withSession: true,
  });
  return check(outcome(res), toBe("BadRequest"));
});

test("a submission with an unknown kind is 400", async () => {
  const { res } = await drive(
    "kind=frobnicate&body=hi",
    { withSession: true },
  );
  return check(outcome(res), toBe("BadRequest"));
});
