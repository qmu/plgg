import {
  test,
  check,
  all,
  toBe,
  toEqual,
  afterEach,
} from "plgg-test";
import {
  request as httpRequest,
  type Server,
} from "node:http";
import {
  pipe,
  ok,
  getOr,
  matchOption,
} from "plgg";
import {
  web,
  get,
  post,
  toFetch,
  param,
  header,
  getBytes,
  textResponse,
  jsonResponse,
  bytesResponse,
  streamResponse,
  Fetch,
} from "plgg-server/index";
import { serve } from "plgg-server/node";

async function* threeBytes(): AsyncIterable<Uint8Array> {
  yield new Uint8Array([1]);
  yield new Uint8Array([2, 3]);
}

const servers: Array<Server> = [];

afterEach(() => {
  while (servers.length > 0) {
    const s = servers.pop();
    if (s) {
      s.close();
    }
  }
});

/**
 * Starts a fetch handler and resolves with its bound port once listening.
 */
const start = (
  handler: Fetch,
  hostname?: string,
): Promise<number> =>
  new Promise((resolve) => {
    const options =
      hostname === undefined
        ? { port: 0 }
        : { port: 0, hostname };
    const server = pipe(
      handler,
      serve(options, () => {
        const addr = server.address();
        resolve(
          typeof addr === "object" &&
            addr !== null
            ? addr.port
            : 0,
        );
      }),
    );
    servers.push(server);
  });

test("serves GET and POST over a real socket", async () => {
  const app = pipe(
    web(),
    get("/hello/:name", async (c) =>
      pipe(
        c,
        param("name"),
        getOr("?"),
        (name) => `hi ${name}`,
        textResponse,
        ok,
      ),
    ),
    post("/echo", async (c) =>
      pipe(
        { body: c.req.body },
        jsonResponse,
        ok,
      ),
    ),
  );

  const port = await start(toFetch(app));

  const got = await fetch(
    `http://127.0.0.1:${port}/hello/sam`,
  );
  const a1 = check(got.status, toBe(200));
  const a2 = check(
    await got.text(),
    toBe("hi sam"),
  );

  const posted = await fetch(
    `http://127.0.0.1:${port}/echo`,
    { method: "POST", body: "ping" },
  );
  const a3 = check(
    await posted.json(),
    toEqual({ body: "ping" }),
  );

  const notFound = await fetch(
    `http://127.0.0.1:${port}/nope`,
  );
  return all([
    a1,
    a2,
    a3,
    check(notFound.status, toBe(404)),
  ]);
});

test("serve honors an explicit hostname", async () => {
  const app = pipe(
    web(),
    get("/", async () =>
      pipe("ok", textResponse, ok),
    ),
  );
  const port = await start(
    toFetch(app),
    "127.0.0.1",
  );
  const res = await fetch(
    `http://127.0.0.1:${port}/`,
  );
  return check(await res.text(), toBe("ok"));
});

test("serve works without an onListen callback", async () => {
  const app = pipe(
    web(),
    get("/", async () =>
      pipe("ok", textResponse, ok),
    ),
  );
  const server = pipe(
    toFetch(app),
    serve({ port: 0 }),
  );
  servers.push(server);
  await new Promise<void>((resolve) =>
    server.on("listening", () => resolve()),
  );
  const addr = server.address();
  const port =
    typeof addr === "object" && addr !== null
      ? addr.port
      : 0;
  const res = await fetch(
    `http://127.0.0.1:${port}/`,
  );
  return check(await res.text(), toBe("ok"));
});

test("multi-valued request headers are joined", async () => {
  const app = pipe(
    web(),
    get("/h", async (c) =>
      pipe(
        c,
        header("x-multi"),
        getOr("none"),
        textResponse,
        ok,
      ),
    ),
  );
  const port = await start(toFetch(app));

  const body = await new Promise<string>(
    (resolve, reject) => {
      const req = httpRequest(
        {
          host: "127.0.0.1",
          port,
          path: "/h",
          method: "GET",
          headers: { "x-multi": ["a", "b"] },
        },
        (res) => {
          let data = "";
          res.on("data", (c) => {
            data += c;
          });
          res.on("end", () => resolve(data));
        },
      );
      req.on("error", reject);
      req.end();
    },
  );
  return check(body, toBe("a, b"));
});

test("serves a binary response carrying a Content-Length", async () => {
  const app = pipe(
    web(),
    get("/blob", async () =>
      ok(
        bytesResponse(
          new Uint8Array([5, 6, 7, 8]),
        ),
      ),
    ),
  );
  const port = await start(toFetch(app));
  const res = await fetch(
    `http://127.0.0.1:${port}/blob`,
  );
  const a1 = check(
    res.headers.get("content-length"),
    toBe("4"),
  );
  const a2 = check(
    res.headers.get("content-type"),
    toBe("application/octet-stream"),
  );
  const buf = new Uint8Array(
    await res.arrayBuffer(),
  );
  return all([
    a1,
    a2,
    check(Array.from(buf), toEqual([5, 6, 7, 8])),
  ]);
});

test("serves a streamed response chunk by chunk", async () => {
  const app = pipe(
    web(),
    get("/stream", async () =>
      ok(streamResponse(threeBytes())),
    ),
  );
  const port = await start(toFetch(app));
  const res = await fetch(
    `http://127.0.0.1:${port}/stream`,
  );
  const buf = new Uint8Array(
    await res.arrayBuffer(),
  );
  return check(
    Array.from(buf),
    toEqual([1, 2, 3]),
  );
});

test("reads a binary request body and reports its byte length", async () => {
  const app = pipe(
    web(),
    post("/upload", async (c) =>
      pipe(
        c.req,
        getBytes,
        matchOption(
          () => "no bytes",
          (b) => `${b.byteLength} bytes`,
        ),
        textResponse,
        ok,
      ),
    ),
  );
  const port = await start(toFetch(app));
  const res = await fetch(
    `http://127.0.0.1:${port}/upload`,
    {
      method: "POST",
      headers: {
        "content-type":
          "application/octet-stream",
      },
      body: new Uint8Array([1, 2, 3, 4, 5]),
    },
  );
  return check(await res.text(), toBe("5 bytes"));
});

test("a body within maxBodyBytes is served; one over the cap is 413", async () => {
  const app = pipe(
    web(),
    post("/upload", async (c) =>
      pipe(
        c.req,
        getBytes,
        matchOption(
          () => "no bytes",
          (b) => `${b.byteLength} bytes`,
        ),
        textResponse,
        ok,
      ),
    ),
  );
  const server = pipe(
    toFetch(app),
    serve({ port: 0, maxBodyBytes: 8 }),
  );
  servers.push(server);
  const port = await new Promise<number>(
    (resolve) =>
      server.on("listening", () => {
        const addr = server.address();
        resolve(
          typeof addr === "object" &&
            addr !== null
            ? addr.port
            : 0,
        );
      }),
  );

  const small = await fetch(
    `http://127.0.0.1:${port}/upload`,
    {
      method: "POST",
      headers: {
        "content-type":
          "application/octet-stream",
      },
      body: new Uint8Array([1, 2, 3]),
    },
  );
  const a1 = check(
    await small.text(),
    toBe("3 bytes"),
  );

  const big = await fetch(
    `http://127.0.0.1:${port}/upload`,
    {
      method: "POST",
      headers: {
        "content-type":
          "application/octet-stream",
      },
      body: new Uint8Array(64),
    },
  );
  const a2 = check(big.status, toBe(413));
  return all([
    a1,
    a2,
    check(
      await big.text(),
      toBe("Payload Too Large"),
    ),
  ]);
});

test("a rejecting handler surfaces as a 500 from the adapter", async () => {
  const broken: Fetch = () =>
    Promise.reject(new Error("down"));
  const port = await start(broken);
  const res = await fetch(
    `http://127.0.0.1:${port}/anything`,
  );
  const a1 = check(res.status, toBe(500));
  return all([
    a1,
    check(
      await res.text(),
      toBe("Internal Server Error"),
    ),
  ]);
});
