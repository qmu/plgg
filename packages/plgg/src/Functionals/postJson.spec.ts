import {
  test,
  expect,
  assert,
  vi,
  afterEach,
} from "plgg-test";
import {
  postJson,
  isOk,
  isErr,
} from "plgg/index";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("postJson returns Ok for 2xx response", async () => {
  const mockFetch = vi.fn(async (_url, init) => {
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<
      string,
      string
    >;
    expect(headers["Content-Type"]).toBe(
      "application/json",
    );
    expect(headers["X-Trace"]).toBe("abc");
    expect(init?.body).toBe(
      JSON.stringify({ hello: "world" }),
    );
    return new Response(
      JSON.stringify({ ok: true, echo: "world" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  });
  globalThis.fetch =
    mockFetch as unknown as typeof fetch;

  const result = await postJson({
    url: "https://example.test/api",
    headers: { "X-Trace": "abc" },
  })({ hello: "world" });

  assert(isOk(result));
  expect(result.content).toEqual({
    ok: true,
    echo: "world",
  });
  expect(mockFetch).toHaveBeenCalledOnce();
});

test("postJson returns Err for non-2xx response", async () => {
  const mockFetch = vi.fn(
    async () =>
      new Response("server blew up", {
        status: 500,
      }),
  );
  globalThis.fetch =
    mockFetch as unknown as typeof fetch;

  const result = await postJson({
    url: "https://example.test/api",
    headers: {},
  })({ attempt: 1 });

  assert(isErr(result));
  expect(result.content.message).toContain(
    "HTTP Error status: 500",
  );
  expect(result.content.message).toContain(
    "server blew up",
  );
});

test("postJson does not follow a redirect (manual policy)", async () => {
  const mockFetch = vi.fn(async (_url, init) => {
    // the request must opt out of auto-following
    expect(init?.redirect).toBe("manual");
    // an opaque-redirect response (what fetch returns under redirect:manual)
    return {
      ok: false,
      status: 0,
      type: "opaqueredirect",
      text: async () => "",
      json: async () => ({}),
    } as unknown as Response;
  });
  globalThis.fetch =
    mockFetch as unknown as typeof fetch;

  const result = await postJson({
    url: "https://example.test/api",
    headers: { "x-api-key": "secret" },
  })({ attempt: 1 });

  assert(isErr(result));
  expect(result.content.message).toContain(
    "redirect not followed",
  );
});
