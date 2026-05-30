import {
  test,
  expect,
  assert,
  vi,
  afterEach,
} from "vitest";
import { postJson, isOk, isErr } from "plgg/index";

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
