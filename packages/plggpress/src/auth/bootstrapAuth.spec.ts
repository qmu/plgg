import {
  test,
  check,
  toBe,
} from "plgg-test";
import {
  type Result,
  type Dict,
  ok,
  none,
  isErr,
  matchResult,
} from "plgg";
import {
  type HttpRequest,
  type HttpResponse,
  type HttpError,
  type Method,
  type Web,
  web,
  get,
  handle,
} from "plgg-server";
import { jsonResponse } from "plgg-http";
import {
  hashPassword,
  asSubject,
  asUsername,
} from "plgg-auth";
import { openDb } from "plgg-content";
import { bootstrapAuthWeb } from "plggpress/auth/bootstrapAuth";

const ISSUER = "https://op.example";
const NOW = 1_700_000_000;
const PW = "s3cret-passphrase";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const reqUrl = (
  method: Method,
  rawUrl: string,
  headers: Dict<string, string> = {},
  body = "",
): HttpRequest => {
  const u = new URL(rawUrl, ISSUER);
  return {
    method,
    path: u.pathname,
    query: Object.fromEntries(
      u.searchParams.entries(),
    ),
    headers,
    params: {},
    body,
    bytes: none(),
  };
};

const header = (
  res: HttpResponse,
  name: string,
): string => res.headers[name] ?? "";

const cookieOf = (
  setCookie: string,
  name: string,
): string => {
  const m = new RegExp(
    `${name}=([^;]+)`,
  ).exec(setCookie);
  return m === null ? "" : m[1] ?? "";
};

const outcome = (
  r: Result<HttpResponse, HttpError>,
): string =>
  matchResult<HttpResponse, HttpError, string>(
    (e: HttpError) => e.__tag,
    (res: HttpResponse) =>
      String(res.status.content),
  )(r);

/** Boot the OP+RP over a fresh in-memory DB with an admin account seeded. */
const fresh = async (): Promise<Web> => {
  const db = openDb(":memory:");
  const adminApp = get("/", async () =>
    ok(jsonResponse({ admin: true })),
  )(web());
  const boot = must(
    await bootstrapAuthWeb(
      db,
      ISSUER,
      "demo-rp",
      () => NOW,
      3600,
      adminApp,
    ),
  );
  const hash = must(await hashPassword(PW));
  const subject = must(asSubject("user-42"));
  await boot.accounts.saveAccount({
    subject,
    username: must(asUsername("alice")),
    passwordHash: hash,
    createdAt: NOW,
  });
  await boot.accounts.setRole(subject, "admin");
  return boot.web;
};

/** Drive /auth/start -> /authorize, returning the OP login URL + pending cookie + the stashed state. */
const toLogin = async (
  app: Web,
): Promise<{
  loginUrl: string;
  pending: string;
  state: string;
}> => {
  const start = must(
    await handle(app, reqUrl("GET", "/auth/start")),
  );
  const authorizeUrl = header(start, "location");
  const authorize = must(
    await handle(
      app,
      reqUrl("GET", authorizeUrl),
    ),
  );
  return {
    loginUrl: header(authorize, "location"),
    pending: cookieOf(
      header(start, "set-cookie"),
      "plgg_rp_pending",
    ),
    state:
      new URL(authorizeUrl).searchParams.get(
        "state",
      ) ?? "",
  };
};

const form = (
  username: string,
  password: string,
): string =>
  `username=${username}&password=${password}`;

test("the full dogfooded OP+RP login flow reaches /admin", async () => {
  const app = await fresh();
  const { loginUrl, pending } =
    await toLogin(app);
  const login = must(
    await handle(
      app,
      reqUrl(
        "POST",
        loginUrl,
        {
          "content-type":
            "application/x-www-form-urlencoded",
        },
        form("alice", PW),
      ),
    ),
  );
  const callback = must(
    await handle(
      app,
      reqUrl(
        "GET",
        header(login, "location"),
        {
          cookie: `plgg_rp_pending=${pending}`,
        },
      ),
    ),
  );
  const session = cookieOf(
    header(callback, "set-cookie"),
    "plgg_rp_session",
  );
  const admin = must(
    await handle(
      app,
      reqUrl("GET", "/admin", {
        cookie: `plgg_rp_session=${session}`,
      }),
    ),
  );
  return check(admin.status.content, toBe(200));
});

test("wrong credentials at the OP login are 401", async () => {
  const app = await fresh();
  const { loginUrl } = await toLogin(app);
  return check(
    outcome(
      await handle(
        app,
        reqUrl(
          "POST",
          loginUrl,
          {
            "content-type":
              "application/x-www-form-urlencoded",
          },
          form("alice", "wrong-password"),
        ),
      ),
    ),
    toBe("Unauthorized"),
  );
});

test("a bad request_id at the OP login is 400", async () => {
  const app = await fresh();
  return check(
    outcome(
      await handle(
        app,
        reqUrl(
          "POST",
          "/auth/login?request_id=not-a-real-id",
          {
            "content-type":
              "application/x-www-form-urlencoded",
          },
          form("alice", PW),
        ),
      ),
    ),
    toBe("BadRequest"),
  );
});

test("an unknown pending id at the callback is 400", async () => {
  const app = await fresh();
  return check(
    outcome(
      await handle(
        app,
        reqUrl(
          "GET",
          "/auth/callback?code=c&state=s",
          {
            cookie:
              "plgg_rp_pending=never-issued",
          },
        ),
      ),
    ),
    toBe("BadRequest"),
  );
});

test("a bad callback state is 401", async () => {
  const app = await fresh();
  const { pending } = await toLogin(app);
  // real pending, wrong state -> completeLogin state_mismatch
  // -> 401 (short-circuits before any OP call)
  return check(
    outcome(
      await handle(
        app,
        reqUrl(
          "GET",
          "/auth/callback?code=c&state=not-the-state",
          {
            cookie: `plgg_rp_pending=${pending}`,
          },
        ),
      ),
    ),
    toBe("Unauthorized"),
  );
});

test("a matching state but an invalid code is 401 (token exchange fails)", async () => {
  const app = await fresh();
  const { pending, state } =
    await toLogin(app);
  // correct state passes completeLogin's state check, then a
  // bogus code fails the OP token exchange -> 401.
  return check(
    outcome(
      await handle(
        app,
        reqUrl(
          "GET",
          `/auth/callback?code=bogus-code&state=${state}`,
          {
            cookie: `plgg_rp_pending=${pending}`,
          },
        ),
      ),
    ),
    toBe("Unauthorized"),
  );
});
