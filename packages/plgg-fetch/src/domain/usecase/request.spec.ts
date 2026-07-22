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
import { isOk } from "plgg";
import {
  request,
  get,
  post,
  put,
  patch,
  del,
  isNetworkError,
  readBytes,
  readStream,
  multipart,
  field,
  file,
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

// --- transport: timeout, readAs, multipart ---

test("timeoutMs aborts a request that outlasts it, folding to a NetworkError", async () => {
  stubFetch(
    (req: Request) =>
      new Promise<Response>((resolve, reject) => {
        req.signal.addEventListener("abort", () =>
          reject(new Error("aborted by signal")),
        );
        // Safety net so the test can never hang if the abort misfires:
        // resolve late (well after the 5ms timeout) — the request will then
        // succeed and this test fails loudly rather than stalling.
        setTimeout(
          () => resolve(new Response("late")),
          300,
        );
      }),
  );
  return check(
    await get("http://example.test/slow", {
      timeoutMs: 5,
    }),
    errThen((e) => toBe(true)(isNetworkError(e))),
  );
});

test("readAs bytes yields a Bytes body, read via readBytes", async () => {
  stubFetch(
    async () =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
      }),
  );
  const res = await get(
    "http://example.test/blob",
    { readAs: "bytes" },
  );
  if (!isOk(res)) {
    throw new Error("expected an Ok response");
  }
  const bytes = readBytes(res.content);
  if (!isOk(bytes)) {
    throw new Error("expected a bytes body");
  }
  return check([...bytes.content], toEqual([1, 2, 3]));
});

test("a multipart body is sent as form-data", async () => {
  let captured: Request | undefined;
  stubFetch(async (req: Request) => {
    captured = req;
    return new Response("ok", { status: 200 });
  });
  await post("http://example.test/upload", {
    multipart: multipart([
      field("name", "ada"),
      file(
        "doc",
        "a.txt",
        new Uint8Array([65, 66]),
      ),
    ]),
  });
  if (captured === undefined) {
    throw new Error("fetch was not called");
  }
  const form = await captured.formData();
  const doc = form.get("doc");
  const docText =
    doc instanceof Blob ? await doc.text() : "";
  return all([
    check(String(form.get("name")), toBe("ada")),
    check(doc instanceof Blob, toBe(true)),
    check(docText, toBe("AB")),
  ]);
});

test("readAs stream reads the response body as incremental chunks", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([104]));
      controller.enqueue(new Uint8Array([105]));
      controller.close();
    },
  });
  stubFetch(
    async () =>
      new Response(stream, { status: 200 }),
  );
  const res = await get(
    "http://example.test/sse",
    { readAs: "stream" },
  );
  if (!isOk(res)) {
    throw new Error("expected an Ok response");
  }
  const streamR = readStream(res.content);
  if (!isOk(streamR)) {
    throw new Error("expected a stream body");
  }
  const collected: number[] = [];
  for await (const c of streamR.content) {
    collected.push(...c);
  }
  return check(collected, toEqual([104, 105]));
});

test("readAs stream on an empty (null) body yields no chunks", async () => {
  stubFetch(
    async () =>
      new Response(null, { status: 204 }),
  );
  const res = await get(
    "http://example.test/empty",
    { readAs: "stream" },
  );
  if (!isOk(res)) {
    throw new Error("expected an Ok response");
  }
  const streamR = readStream(res.content);
  if (!isOk(streamR)) {
    throw new Error("expected a stream body");
  }
  const collected: number[] = [];
  for await (const c of streamR.content) {
    collected.push(...c);
  }
  return check(collected, toEqual([]));
});

test("a multipart file part carries its declared content-type", async () => {
  let captured: Request | undefined;
  stubFetch(async (req: Request) => {
    captured = req;
    return new Response("ok", { status: 200 });
  });
  await post("http://example.test/upload", {
    multipart: multipart([
      file(
        "img",
        "a.png",
        new Uint8Array([1, 2]),
        "image/png",
      ),
    ]),
  });
  if (captured === undefined) {
    throw new Error("fetch was not called");
  }
  const form = await captured.formData();
  const img = form.get("img");
  return check(
    img instanceof Blob ? img.type : "",
    toBe("image/png"),
  );
});
