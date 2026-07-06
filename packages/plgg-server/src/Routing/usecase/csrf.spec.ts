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
  none,
  matchResult,
} from "plgg";
import { jsonResponse } from "plgg-http";
import {
  type HttpRequest,
  type HttpResponse,
  type HttpError,
  type Method,
  type Next,
  makeContext,
} from "plgg-server";
import {
  issueCsrfToken,
  requireCsrf,
} from "plgg-server/Routing/usecase/csrf";

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

const guard = requireCsrf("csrf", "csrf_token");

test("issueCsrfToken is 64 hex chars", () =>
  all([
    check(issueCsrfToken().length, toBe(64)),
    check(
      /^[0-9a-f]+$/.test(issueCsrfToken()),
      toBe(true),
    ),
  ]));

test("a safe method skips the check", async () =>
  check(
    outcome(
      await guard(makeContext(req("GET")), next),
    ),
    toBe("200"),
  ));

test("matching cookie + header token passes", async () =>
  check(
    outcome(
      await guard(
        makeContext(
          req("POST", {
            cookie: "csrf=abc123",
            "x-csrf-token": "abc123",
          }),
        ),
        next,
      ),
    ),
    toBe("200"),
  ));

test("a matching form-field token passes", async () =>
  check(
    outcome(
      await guard(
        makeContext(
          req(
            "POST",
            { cookie: "csrf=abc123" },
            "csrf_token=abc123",
          ),
        ),
        next,
      ),
    ),
    toBe("200"),
  ));

test("a mismatched token is 403", async () =>
  check(
    outcome(
      await guard(
        makeContext(
          req("POST", {
            cookie: "csrf=abc123",
            "x-csrf-token": "nope",
          }),
        ),
        next,
      ),
    ),
    toBe("Forbidden"),
  ));

test("an absent cookie is 403", async () =>
  check(
    outcome(
      await guard(
        makeContext(
          req("POST", {
            "x-csrf-token": "abc123",
          }),
        ),
        next,
      ),
    ),
    toBe("Forbidden"),
  ));

test("an absent submitted token is 403", async () =>
  check(
    outcome(
      await guard(
        makeContext(
          req("POST", { cookie: "csrf=abc123" }),
        ),
        next,
      ),
    ),
    toBe("Forbidden"),
  ));
