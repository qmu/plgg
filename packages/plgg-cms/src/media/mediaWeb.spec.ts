import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  type Option,
  type Dict,
  isErr,
  some,
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
  openAssetStore,
  sqlAssetStore,
} from "plgg-content";
import { memoryRpSessionStore } from "plgg-cms/auth/rpSessionStore";
import { mediaWeb } from "plgg-cms/media/mediaWeb";

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
  app: ReturnType<typeof mediaWeb>;
}> => {
  const db = must(
    await openAssetStore(":memory:"),
  );
  const sessions = memoryRpSessionStore();
  must(
    await sessions.save({
      id: "sess-1",
      subject: "guest-9",
      expiresAt: NOW + 3600,
    }),
  );
  return { db, app: mediaWeb(db, sessions, clock) };
};

const req = (
  method: Method,
  path: string,
  headers: Dict<string, string> = {},
  bytes: Option<Uint8Array> = none(),
  query: Dict<string, string> = {},
): HttpRequest => ({
  method,
  path,
  query,
  headers,
  params: {},
  body: "",
  bytes,
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
  const m = /plgg_media_csrf=([^;]+)/.exec(
    res.headers["set-cookie"] ?? "",
  );
  return m === null ? "" : m[1] ?? "";
};

test("GET /new renders the upload form + a CSRF cookie", async () => {
  const { app } = await setup();
  const res = must(
    await handle(app, req("GET", "/new")),
  );
  return all([
    check(res.status.content, toBe(200)),
    check(
      String(res.body).includes(
        "Upload media",
      ),
      toBe(true),
    ),
    check(csrfFrom(res).length > 0, toBe(true)),
  ]);
});

const upload = async (opts: {
  session?: boolean;
  csrf?: boolean;
}) => {
  const { db, app } = await setup();
  const token = csrfFrom(
    must(await handle(app, req("GET", "/new"))),
  );
  const cookie =
    opts.session === false
      ? `plgg_media_csrf=${token}`
      : `plgg_media_csrf=${token}; plgg_rp_session=sess-1`;
  const headers: Dict<string, string> =
    opts.csrf === false
      ? { "content-type": "image/png", cookie }
      : {
          "content-type": "image/png",
          cookie,
          "x-csrf-token": token,
        };
  const res = await handle(
    app,
    req(
      "POST",
      "/upload",
      headers,
      some(new Uint8Array([65, 66, 67])),
      { path: "assets/x.png" },
    ),
  );
  return { db, res };
};

test("a signed-in upload stores a content-addressed asset and serves its bytes", async () => {
  const { db, res } = await upload({});
  const list = must(
    await sqlAssetStore(db).listAssets({
      createdBy: none(),
      status: none(),
    }),
  );
  const served = must(
    await handle(
      mediaWeb(
        db,
        memoryRpSessionStore(),
        clock,
      ),
      req("GET", "/item/1"),
    ),
  );
  return all([
    check(outcome(res), toBe("200")),
    check(list.length, toBe(1)),
    check(
      list[0]?.mime ?? "",
      toBe("image/png"),
    ),
    // the byte-serve returns the recorded mime
    check(served.status.content, toBe(200)),
    check(
      served.headers["content-type"] ?? "",
      toBe("image/png"),
    ),
  ]);
});

test("an anonymous upload is 401 and a CSRF-less upload is 403", async () => {
  const anon = await upload({ session: false });
  const noCsrf = await upload({ csrf: false });
  return all([
    check(outcome(anon.res), toBe("Unauthorized")),
    check(outcome(noCsrf.res), toBe("Forbidden")),
  ]);
});

test("serving an unknown asset is 404", async () => {
  const { db } = await setup();
  return check(
    outcome(
      await handle(
        mediaWeb(
          db,
          memoryRpSessionStore(),
          clock,
        ),
        req("GET", "/item/999"),
      ),
    ),
    toBe("NotFound"),
  );
});
