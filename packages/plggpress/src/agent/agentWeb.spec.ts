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
  ok,
  err,
  some,
  none,
  defect,
  matchResult,
} from "plgg";
import {
  type HttpRequest,
  type HttpResponse,
  type HttpError,
  type Method,
  handle,
} from "plgg-server";
import { type KeyMinter } from "plgg-kit";
import { memoryRpSessionStore } from "plggpress/auth/rpSessionStore";
import { agentWeb } from "plggpress/agent/agentWeb";

const NOW = 1_700_000_000;
const clock = () => NOW;

const must = <T>(
  r: Result<T, unknown>,
): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const okMinter: Option<KeyMinter> = some({
  mint: async () =>
    ok({ value: "ek_secret", expiresAt: 999 }),
});
const failMinter: Option<KeyMinter> = some({
  mint: async () => err(defect("upstream down")),
});

const app = async (minter: Option<KeyMinter>) => {
  const sessions = memoryRpSessionStore();
  must(
    await sessions.save({
      id: "sess-1",
      subject: "guest-9",
      expiresAt: NOW + 3600,
    }),
  );
  return agentWeb(minter, sessions, clock);
};

const req = (
  headers: Dict<string, string> = {},
): HttpRequest => ({
  method: "POST" as Method,
  path: "/session",
  query: {},
  headers,
  params: {},
  body: "",
  bytes: none(),
});

const authed = {
  cookie: "plgg_rp_session=sess-1",
};

const outcome = (
  r: Result<HttpResponse, HttpError>,
): string =>
  matchResult<HttpResponse, HttpError, string>(
    (e: HttpError) => e.__tag,
    (res: HttpResponse) =>
      String(res.status.content),
  )(r);

test("an anonymous mint request is 401", async () => {
  const res = await handle(
    await app(okMinter),
    req(),
  );
  return check(
    outcome(res),
    toBe("Unauthorized"),
  );
});

test("with no key configured the route is 404 (voice agent dark)", async () => {
  const res = await handle(
    await app(none()),
    req(authed),
  );
  return check(outcome(res), toBe("NotFound"));
});

test("an authed request mints and returns the ephemeral key", async () => {
  const res = must(
    await handle(
      await app(okMinter),
      req(authed),
    ),
  );
  return all([
    check(res.status.content, toBe(200)),
    check(
      String(res.body).includes("ek_secret"),
      toBe(true),
    ),
  ]);
});

test("a mint failure is a clean 500, not a throw", async () => {
  const res = await handle(
    await app(failMinter),
    req(authed),
  );
  return check(
    outcome(res),
    toBe("InternalError"),
  );
});
