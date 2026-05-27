import {
  test,
  expect,
  vi,
  afterEach,
} from "vitest";
import { isOk, isErr } from "plgg";
import {
  request,
  get,
  post,
  put,
  patch,
  del,
  isNetworkError,
} from "plgg-http-client/index";

type FetchImpl = (
  request: Request,
) => Promise<Response>;

const stubFetch = (impl: FetchImpl): void =>
  void vi.stubGlobal("fetch", vi.fn(impl));

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
  const result = await get("http://example.test/");
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content.status.content).toBe(200);
    expect(result.content.body).toBe("hello");
  }
});

test("a non-2xx status comes back as Ok, for the caller to decide", async () => {
  stubFetch(
    async () =>
      new Response("nope", { status: 404 }),
  );
  const result = await get(
    "http://example.test/missing",
  );
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content.status.content).toBe(404);
  }
});

test("a transport rejection folds to a NetworkError", async () => {
  stubFetch(async () => {
    throw new Error("connection refused");
  });
  const result = await get("http://example.test/");
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(isNetworkError(result.content)).toBe(true);
    if (isNetworkError(result.content)) {
      expect(result.content.content.message).toContain(
        "connection refused",
      );
    }
  }
});

test("a non-Error rejection still yields a NetworkError (messageOf String path)", async () => {
  stubFetch(async () => {
    throw "plain failure";
  });
  const result = await get("http://example.test/");
  expect(isErr(result)).toBe(true);
  if (isErr(result) && isNetworkError(result.content)) {
    expect(result.content.content.message).toBe(
      "plain failure",
    );
  }
});

test("a malformed URL folds to a NetworkError before fetch is reached", async () => {
  const fetchSpy = vi.fn(
    async () => new Response("unused"),
  );
  vi.stubGlobal("fetch", fetchSpy);
  const result = await get("not a url");
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.content.__tag).toBe("NetworkError");
  }
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("post sends the method, merged query, headers, and body", async () => {
  const fetched = captureFetch();
  await post("http://example.test/users", {
    body: '{"a":1}',
    headers: { "content-type": "application/json" },
    query: { debug: "1" },
  });
  const req = fetched.seen();
  expect(req.method).toBe("POST");
  expect(
    new URL(req.url).searchParams.get("debug"),
  ).toBe("1");
  expect(req.headers.get("content-type")).toBe(
    "application/json",
  );
  await expect(req.text()).resolves.toBe('{"a":1}');
});

test("get defaults query/headers/body when no options are given", async () => {
  const fetched = captureFetch();
  await get("http://example.test/");
  const req = fetched.seen();
  expect(req.method).toBe("GET");
  expect(new URL(req.url).search).toBe("");
  await expect(req.text()).resolves.toBe("");
});

test("put, patch, and del issue their respective methods", async () => {
  const seen: Array<string> = [];
  stubFetch(async (req: Request) => {
    seen.push(req.method);
    return new Response("ok");
  });
  await put("http://example.test/a", { body: "x" });
  await patch("http://example.test/a", { body: "x" });
  await del("http://example.test/a");
  expect(seen).toEqual(["PUT", "PATCH", "DELETE"]);
});

test("request is callable directly with an explicit method", async () => {
  const fetched = captureFetch();
  await request("PATCH", "http://example.test/r");
  expect(fetched.seen().method).toBe("PATCH");
});
