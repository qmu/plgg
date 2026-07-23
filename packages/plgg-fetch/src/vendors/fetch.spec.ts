import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { none } from "plgg";
import {
  HttpRequest,
  bytesBody,
} from "plgg-http";
import {
  toFetchRequest,
  fromFetchResponse,
  messageOf,
} from "plgg-fetch/vendors/fetch";

const baseRequest = (
  overrides: Partial<HttpRequest>,
): HttpRequest => ({
  method: "GET",
  path: "http://example.test/",
  query: {},
  headers: {},
  params: {},
  body: "",
  bytes: none(),
  ...overrides,
});

test("messageOf reads an Error's message and stringifies anything else", () =>
  all([
    check(
      messageOf(new Error("boom")),
      toBe("boom"),
    ),
    check(messageOf("oops"), toBe("oops")),
    check(messageOf(42), toBe("42")),
  ]));

test("toFetchRequest builds a native Request with method, query, headers, and body", async () => {
  const native = toFetchRequest(
    baseRequest({
      method: "POST",
      path: "http://example.test/users",
      query: { q: "cat", page: "2" },
      headers: {
        "content-type": "application/json",
      },
      body: '{"name":"Ada"}',
    }),
  );
  const url = new URL(native.url);
  return all([
    check(native.method, toBe("POST")),
    check(
      url.searchParams.get("q"),
      toBe("cat"),
    ),
    check(
      url.searchParams.get("page"),
      toBe("2"),
    ),
    check(
      native.headers.get("content-type"),
      toBe("application/json"),
    ),
    check(
      await native.text(),
      toBe('{"name":"Ada"}'),
    ),
  ]);
});

test("toFetchRequest omits the body on a GET, even if one is supplied", async () => {
  const native = toFetchRequest(
    baseRequest({
      method: "GET",
      body: "ignored",
    }),
  );
  return all([
    check(native.method, toBe("GET")),
    check(await native.text(), toBe("")),
  ]);
});

test("toFetchRequest throws on a malformed URL", () => {
  let threw = false;
  try {
    toFetchRequest(
      baseRequest({ path: "not a url" }),
    );
  } catch {
    threw = true;
  }
  return check(threw, toBe(true));
});

test("fromFetchResponse lifts status, headers, and body into an HttpResponse", async () =>
  check(
    await fromFetchResponse(
      new Response("hi", {
        status: 201,
        headers: { "x-extra": "v" },
      }),
    ),
    okThen((r) =>
      all([
        check(r.status.content, toBe(201)),
        check(
          r.headers["x-extra"],
          toBe("v"),
        ),
        check(r.body, toBe("hi")),
      ]),
    ),
  ));

test("fromFetchResponse treats a non-2xx status as a valid response, not an error", async () =>
  check(
    await fromFetchResponse(
      new Response("Not Found", {
        status: 404,
      }),
    ),
    okThen((r) =>
      all([
        check(r.status.content, toBe(404)),
        check(r.body, toBe("Not Found")),
      ]),
    ),
  ));

test("fromFetchResponse folds a failed body read into a NetworkError", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start: (controller) =>
      controller.error(new Error("read failed")),
  });
  return check(
    await fromFetchResponse(
      new Response(stream),
    ),
    errThen((e) =>
      check(e.__tag, toBe("NetworkError")),
    ),
  );
});

test("toFetchRequest sets redirect:manual so a 3xx is never auto-followed", () => {
  const native = toFetchRequest(baseRequest({}));
  return check(native.redirect, toBe("manual"));
});

test("fromFetchResponse folds an opaque redirect into a RedirectError", async () =>
  check(
    await fromFetchResponse(
      // A partial Response double: fromFetchResponse only reads .type and
      // .text(). The cast forges the opaqueredirect the platform will not let
      // us construct via the Response constructor (pre-existing, irreducible
      // test double — Amendment 3 precedent; count unchanged).
      {
        type: "opaqueredirect",
        text: async () => "",
      } as unknown as Response,
    ),
    errThen((e) =>
      check(e.__tag, toBe("RedirectError")),
    ),
  ));

test("bytesBody is the reused router type the client never produces", () =>
  // documents that the client's text seam and the router's binary body share
  // one ResponseBody union — the client simply stays on the text path.
  check(
    bytesBody(new Uint8Array([1])).__tag,
    toBe("Bytes"),
  ));
