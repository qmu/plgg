import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  type Dict,
  ok,
  err,
  none,
  pipe,
  isErr,
  isSome,
  fromNullable,
  defect,
  matchOption,
  matchResult,
} from "plgg";
import { type RpSessionStore } from "plggpress/auth/rpSessionStore";
import {
  type HttpRequest,
  type HttpResponse,
  type HttpError,
  type Method,
  web,
  get,
  handle,
} from "plgg-server";
import { jsonResponse } from "plgg-http";
import {
  type Role,
  type AccountStore,
} from "plgg-auth";

/** A minimal AccountStore that only knows a role map (the resolver reads findRole). */
const stubAccounts = (
  role: Role,
): AccountStore => ({
  findRole: async () => fromNullable(role),
  setRole: async () => undefined,
  clearRole: async () => undefined,
  findAccountByUsername: async () => none(),
  saveAccount: async () => undefined,
  saveInvite: async () => undefined,
  takeInvite: async () => none(),
});
import { memoryRpSessionStore } from "plggpress/auth/rpSessionStore";
import {
  RP_SESSION_COOKIE,
  rpRoleResolver,
  guardAdmin,
  establishRpSession,
} from "plggpress/auth/pressAuth";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const NOW = 1_700_000_000;

const req = (
  method: Method,
  headers: Dict<string, string> = {},
): HttpRequest => ({
  method,
  path: "/admin",
  query: {},
  headers,
  params: {},
  body: "",
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

/** An /admin app guarded by an rp-session resolver, seeded with one session. */
const seeded = async (
  role: Role,
  expiresAt: number,
) => {
  const sessions = memoryRpSessionStore();
  must(
    await sessions.save({
      id: "s1",
      subject: "user-42",
      expiresAt,
    }),
  );
  const adminApp = get("/", async () =>
    ok(jsonResponse({ ok: true })),
  )(web());
  return pipe(
    web(),
    guardAdmin(
      rpRoleResolver(
        sessions,
        stubAccounts(role),
        () => NOW,
      ),
    )(adminApp),
  );
};

test("an admin session reaches /admin (200)", async () => {
  const app = await seeded("admin", NOW + 3600);
  return check(
    outcome(
      await handle(
        app,
        req("GET", {
          cookie: `${RP_SESSION_COOKIE}=s1`,
        }),
      ),
    ),
    toBe("200"),
  );
});

test("no session cookie is 401 on /admin", async () => {
  const app = await seeded("admin", NOW + 3600);
  return check(
    outcome(await handle(app, req("GET"))),
    toBe("Unauthorized"),
  );
});

test("a guest role is 403 on /admin", async () => {
  const app = await seeded("guest", NOW + 3600);
  return check(
    outcome(
      await handle(
        app,
        req("GET", {
          cookie: `${RP_SESSION_COOKIE}=s1`,
        }),
      ),
    ),
    toBe("Forbidden"),
  );
});

test("an expired session is 401 on /admin", async () => {
  const app = await seeded("admin", NOW - 1);
  return check(
    outcome(
      await handle(
        app,
        req("GET", {
          cookie: `${RP_SESSION_COOKIE}=s1`,
        }),
      ),
    ),
    toBe("Unauthorized"),
  );
});

const appWith = (
  sessions: RpSessionStore,
  accounts: AccountStore,
): ReturnType<typeof web> =>
  pipe(
    web(),
    guardAdmin(
      rpRoleResolver(
        sessions,
        accounts,
        () => NOW,
      ),
    )(
      get("/", async () =>
        ok(jsonResponse({ ok: true })),
      )(web()),
    ),
  );

const withCookie = (id: string) =>
  req("GET", {
    cookie: `${RP_SESSION_COOKIE}=${id}`,
  });

test("an unknown session id is 401", async () => {
  const app = await seeded("admin", NOW + 3600);
  return check(
    outcome(await handle(app, withCookie("nope"))),
    toBe("Unauthorized"),
  );
});

test("a session-store error is 401", async () => {
  const failing: RpSessionStore = {
    save: async () => ok(null),
    find: async () => err(defect("boom")),
    take: async () => ok(none()),
  };
  return check(
    outcome(
      await handle(
        appWith(failing, stubAccounts("admin")),
        withCookie("s1"),
      ),
    ),
    toBe("Unauthorized"),
  );
});

test("an account-store error is 401", async () => {
  const throwing: AccountStore = {
    ...stubAccounts("admin"),
    findRole: async () => {
      throw new Error("db down");
    },
  };
  const sessions = memoryRpSessionStore();
  must(
    await sessions.save({
      id: "s1",
      subject: "user-42",
      expiresAt: NOW + 3600,
    }),
  );
  return check(
    outcome(
      await handle(
        appWith(sessions, throwing),
        withCookie("s1"),
      ),
    ),
    toBe("Unauthorized"),
  );
});

test("establishRpSession persists a session and returns an /admin-scoped cookie", async () => {
  const sessions = memoryRpSessionStore();
  const cookie = must(
    await establishRpSession(
      sessions,
      () => NOW,
      3600,
    )("user-42"),
  );
  const found = must(
    await sessions.find(cookie.value.content),
  );
  return all([
    check(
      cookie.name.content,
      toBe(RP_SESSION_COOKIE),
    ),
    check(
      matchOption(
        () => "",
        (p: string) => p,
      )(cookie.path),
      toBe("/admin"),
    ),
    check(isSome(found), toBe(true)),
  ]);
});

test("establishRpSession surfaces a store error", async () => {
  const failing: RpSessionStore = {
    save: async () => err(defect("boom")),
    find: async () => ok(none()),
    take: async () => ok(none()),
  };
  return check(
    isErr(
      await establishRpSession(
        failing,
        () => NOW,
        3600,
      )("user-42"),
    ),
    toBe(true),
  );
});
