import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import {
  box,
  pipe,
  none,
  isNone,
  getOr,
  chainResult,
} from "plgg";
import {
  CookieName,
  CookieValue,
  asCookieName,
  asCookieValue,
  cookie,
  sessionCookie,
  withPath,
  withDomain,
  withMaxAge,
  withExpires,
  withSameSite,
  httpOnlyCookie,
  secureCookie,
  serializeCookie,
  parseCookies,
  getCookie,
  withSetCookie,
  textResponse,
  HttpRequest,
} from "plgg-http/index";

const name = (s: string): CookieName =>
  box("CookieName")(s);
const value = (s: string): CookieValue =>
  box("CookieValue")(s);

const requestWith = (
  cookieHeader: string,
): HttpRequest => ({
  method: "GET",
  path: "/",
  query: {},
  headers: { cookie: cookieHeader },
  params: {},
  body: "",
  bytes: none(),
});

test("asCookieName accepts a token and rejects separators", () =>
  all([
    check(
      asCookieName("session_id"),
      okThen((n) =>
        toBe("session_id")(n.content),
      ),
    ),
    check(
      asCookieName("bad name"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asCookieName("bad;name"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asCookieName(""),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("asCookieValue rejects semicolons, spaces, and quotes", () =>
  all([
    check(
      asCookieValue("abc123-_."),
      okThen((v) =>
        check(typeof v.content, toBe("string")),
      ),
    ),
    check(
      asCookieValue("a;b"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asCookieValue("a b"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("serializeCookie renders every attribute in RFC shape", () =>
  check(
    serializeCookie(
      pipe(
        cookie(name("sid"), value("v-1")),
        withPath("/app"),
        withDomain("example.test"),
        withMaxAge(3600),
        withExpires(
          new Date(Date.UTC(2026, 0, 2, 3, 4, 5)),
        ),
        httpOnlyCookie,
        secureCookie,
        withSameSite("Strict"),
      ),
    ),
    okThen((line) =>
      toBe(
        "sid=v-1; Path=/app; Domain=example.test; Max-Age=3600; Expires=Fri, 02 Jan 2026 03:04:05 GMT; HttpOnly; Secure; SameSite=Strict",
      )(line),
    ),
  ));

test("a bare cookie serializes to name=value only", () =>
  check(
    serializeCookie(
      cookie(name("a"), value("b")),
    ),
    okThen((line) => toBe("a=b")(line)),
  ));

test("sessionCookie carries the secure baseline", () =>
  check(
    serializeCookie(
      sessionCookie(name("sid"), value("v")),
    ),
    okThen((line) =>
      toBe(
        "sid=v; Path=/; HttpOnly; Secure; SameSite=Lax",
      )(line),
    ),
  ));

test("SameSite=None without Secure is rejected", () =>
  check(
    serializeCookie(
      pipe(
        cookie(name("sid"), value("v")),
        withSameSite("None"),
      ),
    ),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("SameSite=None with Secure serializes", () =>
  check(
    serializeCookie(
      pipe(
        cookie(name("sid"), value("v")),
        secureCookie,
        withSameSite("None"),
      ),
    ),
    okThen((line) =>
      toBe("sid=v; Secure; SameSite=None")(line),
    ),
  ));

test("parseCookies reads pairs, trims, unquotes, and skips malformed", () =>
  check(
    parseCookies(
      'a=1; b = "two" ; malformed; =empty; c=3=3',
    ),
    toEqual({
      a: "1",
      b: "two",
      c: "3=3",
    }),
  ));

test("parseCookies lets later duplicates win", () =>
  check(
    parseCookies("a=1; a=2"),
    toEqual({ a: "2" }),
  ));

test("a __proto__ cookie cannot pollute the result", () => {
  const parsed = parseCookies(
    "__proto__=evil; a=1",
  );
  return all([
    // Own property only — no prototype write.
    check(
      Object.prototype.hasOwnProperty.call(
        parsed,
        "__proto__",
      ),
      toBe(true),
    ),
    check(
      Object.prototype.hasOwnProperty.call(
        {},
        "evil",
      ),
      toBe(false),
    ),
    check(parsed["a"], toBe("1")),
  ]);
});

test("getCookie reads one cookie as an Option", () =>
  all([
    check(
      pipe(
        requestWith("sid=abc; other=1"),
        getCookie("sid"),
        getOr("missing"),
      ),
      toBe("abc"),
    ),
    check(
      isNone(
        pipe(
          requestWith("sid=abc"),
          getCookie("nope"),
        ),
      ),
      toBe(true),
    ),
    check(
      isNone(
        pipe(
          requestWith("sid=abc"),
          getCookie("toString"),
        ),
      ),
      toBe(true),
    ),
  ]));

test("withSetCookie folds multiple cookies onto one Dict entry", () =>
  check(
    pipe(
      withSetCookie(
        cookie(name("a"), value("1")),
      )(textResponse("ok")),
      chainResult(
        withSetCookie(
          sessionCookie(name("b"), value("2")),
        ),
      ),
    ),
    okThen((response) =>
      toBe(
        "a=1\nb=2; Path=/; HttpOnly; Secure; SameSite=Lax",
      )(response.headers["set-cookie"]),
    ),
  ));

test("withSetCookie propagates a serialization failure", () =>
  check(
    withSetCookie(
      pipe(
        cookie(name("a"), value("1")),
        withSameSite("None"),
      ),
    )(textResponse("ok")),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));
