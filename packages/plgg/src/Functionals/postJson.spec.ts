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
import { postJson } from "plgg/index";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("postJson returns Ok for 2xx response", async () => {
  let captured: RequestInit | undefined;
  const mockFetch = vi.fn(
    async (_url: unknown, init?: RequestInit) => {
      captured = init;
      return new Response(
        JSON.stringify({
          ok: true,
          echo: "world",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    },
  );
  globalThis.fetch =
    mockFetch as unknown as typeof fetch;

  const result = await postJson({
    url: "https://example.test/api",
    headers: { "X-Trace": "abc" },
  })({ hello: "world" });

  const headers = captured?.headers;
  const headerRecord =
    headers !== undefined &&
    !(headers instanceof Headers) &&
    !Array.isArray(headers)
      ? headers
      : {};

  return all([
    check(captured?.method, toBe("POST")),
    check(
      headerRecord["Content-Type"],
      toBe("application/json"),
    ),
    check(headerRecord["X-Trace"], toBe("abc")),
    check(
      captured?.body,
      toBe(JSON.stringify({ hello: "world" })),
    ),
    check(
      result,
      okThen(
        toEqual({
          ok: true,
          echo: "world",
        }),
      ),
    ),
    check(mockFetch.mock.calls.length, toBe(1)),
  ]);
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

  return check(
    result,
    errThen((e) =>
      all([
        check(
          e.message,
          toContain("HTTP Error status: 500"),
        ),
        check(
          e.message,
          toContain("server blew up"),
        ),
      ]),
    ),
  );
});

test("postJson does not follow a redirect (manual policy)", async () => {
  let captured: RequestInit | undefined;
  const mockFetch = vi.fn(
    async (_url: unknown, init?: RequestInit) => {
      captured = init;
      // an opaque-redirect response (what fetch returns under redirect:manual)
      return {
        ok: false,
        status: 0,
        type: "opaqueredirect",
        text: async () => "",
        json: async () => ({}),
      } as unknown as Response;
    },
  );
  globalThis.fetch =
    mockFetch as unknown as typeof fetch;

  const result = await postJson({
    url: "https://example.test/api",
    headers: { "x-api-key": "secret" },
  })({ attempt: 1 });

  return all([
    // the request must opt out of auto-following
    check(captured?.redirect, toBe("manual")),
    check(
      result,
      errThen((e) =>
        toContain("redirect not followed")(
          e.message,
        ),
      ),
    ),
  ]);
});
