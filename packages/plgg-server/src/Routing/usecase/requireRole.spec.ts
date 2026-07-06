import {
  test,
  check,
  toBe,
} from "plgg-test";
import {
  type Result,
  ok,
  some,
  none,
  matchResult,
} from "plgg";
import { jsonResponse } from "plgg-http";
import {
  type HttpRequest,
  type Method,
  type HttpResponse,
  type HttpError,
  type Next,
  makeContext,
} from "plgg-server";
import { requireRole } from "plgg-server/Routing/usecase/requireRole";
import { requireScope } from "plgg-server/Routing/usecase/requireScope";

const req = (
  method: Method,
): HttpRequest => ({
  method,
  path: "/",
  query: {},
  headers: {},
  params: {},
  body: "",
  bytes: none(),
});

const next: Next = () =>
  Promise.resolve(ok(jsonResponse({ ok: true })));

const outcome = (
  r: Result<HttpResponse, HttpError>,
): string =>
  matchResult<HttpResponse, HttpError, string>(
    (e: HttpError) => e.__tag,
    (res: HttpResponse) =>
      String(res.status.content),
  )(r);

test("requireRole: unresolved principal → 401", async () => {
  const mw = requireRole<string>(
    async () => none(),
    () => true,
  );
  return check(
    outcome(await mw(makeContext(req("GET")), next)),
    toBe("Unauthorized"),
  );
});

test("requireRole: allowed role → next (200)", async () => {
  const mw = requireRole<string>(
    async () => some("admin"),
    (r: string) => r === "admin",
  );
  return check(
    outcome(await mw(makeContext(req("GET")), next)),
    toBe("200"),
  );
});

test("requireRole: disallowed role → 403", async () => {
  const mw = requireRole<string>(
    async () => some("guest"),
    (r: string) => r === "admin",
  );
  return check(
    outcome(await mw(makeContext(req("GET")), next)),
    toBe("Forbidden"),
  );
});

test("requireScope: insufficient scope → 403", async () => {
  const mw = requireScope<ReadonlyArray<string>>(
    async () => some(["read"]),
    (s: ReadonlyArray<string>) =>
      s.includes("write"),
  );
  return check(
    outcome(await mw(makeContext(req("GET")), next)),
    toBe("Forbidden"),
  );
});

test("requireScope: sufficient scope → next (200)", async () => {
  const mw = requireScope<ReadonlyArray<string>>(
    async () => some(["read", "write"]),
    (s: ReadonlyArray<string>) =>
      s.includes("write"),
  );
  return check(
    outcome(await mw(makeContext(req("GET")), next)),
    toBe("200"),
  );
});
