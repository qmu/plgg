import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toContain,
  okThen,
  errThen,
  vi,
  afterEach,
} from "plgg-test";
import {
  request,
  get,
  post,
  put,
  patch,
  del,
  isNetworkError,
} from "plgg-fetch/index";

type FetchImpl = (
  request: Request,
) => Promise<Response>;

const stubFetch = (impl: FetchImpl): void =>
  vi.stubGlobal("fetch", impl);

const captureFetch = (): {
  seen: () => Request;
} => {
  let captured: Request | undefined;
  stubFetch(async (req: Request) => {
    captured = req;
    return new Response("ok", { status: 200 });
  });
  return {
    seen: () => {
      if (captured === undefined) {
        throw new Error("fetch was not called");
      }
      return captured;
    },
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

test("get returns a successful HttpResponse for a 2xx", async () => {
  stubFetch(
    async () =>
      new Response("hello", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
  );
  return check(
    await get("http://example.test/"),
    okThen((r) =>
      all([
        check(r.status.content, toBe(200)),
        check(r.body, toBe("hello")),
      ]),
    ),
  );
});

test("a non-2xx status comes back as Ok, for the caller to decide", async () => {
  stubFetch(
    async () =>
      new Response("nope", { status: 404 }),
  );
  return check(
    await get("http://example.test/missing"),
    okThen((r) =>
      check(r.status.content, toBe(404)),
    ),
  );
});

test("a transport rejection folds to a NetworkError", async () => {
  stubFetch(async () => {
    throw new Error("connection refused");
  });
  return check(
    await get("http://example.test/"),
    errThen((e) =>
      all([
        check(isNetworkError(e), toBe(true)),
        check(
          isNetworkError(e)
            ? e.content.message
            : "",
          toContain("connection refused"),
        ),
      ]),
    ),
  );
});

test("a non-Error rejection still yields a NetworkError (messageOf String path)", async () => {
  stubFetch(async () => {
    throw "plain failure";
  });
  return check(
    await get("http://example.test/"),
    errThen((e) =>
      all([
        check(isNetworkError(e), toBe(true)),
        check(
          isNetworkError(e)
            ? e.content.message
            : "",
          toBe("plain failure"),
        ),
      ]),
    ),
  );
});

test("a malformed URL folds to a NetworkError before fetch is reached", async () => {
  const fetchSpy = vi.fn(
    async () => new Response("unused"),
  );
  vi.stubGlobal("fetch", fetchSpy);
  return all([
    check(
      await get("not a url"),
      errThen((e) =>
        check(e.__tag, toBe("NetworkError")),
      ),
    ),
    check(fetchSpy.mock.calls.length, toBe(0)),
  ]);
});

test("post sends the method, merged query, headers, and body", async () => {
  const fetched = captureFetch();
  await post("http://example.test/users", {
    body: '{"a":1}',
    headers: { "content-type": "application/json" },
    query: { debug: "1" },
  });
  const req = fetched.seen();
  return all([
    check(req.method, toBe("POST")),
    check(
      new URL(req.url).searchParams.get("debug"),
      toBe("1"),
    ),
    check(
      req.headers.get("content-type"),
      toBe("application/json"),
    ),
    check(await req.text(), toBe('{"a":1}')),
  ]);
});

test("get defaults query/headers/body when no options are given", async () => {
  const fetched = captureFetch();
  await get("http://example.test/");
  const req = fetched.seen();
  return all([
    check(req.method, toBe("GET")),
    check(new URL(req.url).search, toBe("")),
    check(await req.text(), toBe("")),
  ]);
});

test("put, patch, and del issue their respective methods", async () => {
  const seen: Array<string> = [];
  stubFetch(async (req: Request) => {
    seen.push(req.method);
    return new Response("ok");
  });
  await put("http://example.test/a", { body: "x" });
  await patch("http://example.test/a", {
    body: "x",
  });
  await del("http://example.test/a");
  return check(
    seen,
    toEqual(["PUT", "PATCH", "DELETE"]),
  );
});

test("request is callable directly with an explicit method", async () => {
  const fetched = captureFetch();
  await request("PATCH", "http://example.test/r");
  return check(
    fetched.seen().method,
    toBe("PATCH"),
  );
});
