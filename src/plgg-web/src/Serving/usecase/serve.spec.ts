import {
  test,
  expect,
  afterEach,
} from "vitest";
import {
  request as httpRequest,
  type Server,
} from "node:http";
import { pipe, ok, getOr } from "plgg";
import {
  web,
  get,
  post,
  toFetch,
  serve,
  param,
  header,
  textResponse,
  jsonResponse,
  Fetch,
} from "plgg-web/index";

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
          typeof addr === "object" && addr !== null
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
      pipe({ body: c.req.body }, jsonResponse, ok),
    ),
  );

  const port = await start(toFetch(app));

  const got = await fetch(
    `http://127.0.0.1:${port}/hello/sam`,
  );
  expect(got.status).toBe(200);
  await expect(got.text()).resolves.toBe("hi sam");

  const posted = await fetch(
    `http://127.0.0.1:${port}/echo`,
    { method: "POST", body: "ping" },
  );
  await expect(posted.json()).resolves.toEqual({
    body: "ping",
  });

  const notFound = await fetch(
    `http://127.0.0.1:${port}/nope`,
  );
  expect(notFound.status).toBe(404);
});

test("serve honors an explicit hostname", async () => {
  const app = pipe(
    web(),
    get("/", async () => pipe("ok", textResponse, ok)),
  );
  const port = await start(toFetch(app), "127.0.0.1");
  const res = await fetch(
    `http://127.0.0.1:${port}/`,
  );
  await expect(res.text()).resolves.toBe("ok");
});

test("serve works without an onListen callback", async () => {
  const app = pipe(
    web(),
    get("/", async () => pipe("ok", textResponse, ok)),
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
  await expect(res.text()).resolves.toBe("ok");
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
  expect(body).toBe("a, b");
});

test("a rejecting handler surfaces as a 500 from the adapter", async () => {
  const broken: Fetch = () =>
    Promise.reject(new Error("down"));
  const port = await start(broken);
  const res = await fetch(
    `http://127.0.0.1:${port}/anything`,
  );
  expect(res.status).toBe(500);
  await expect(res.text()).resolves.toBe(
    "Internal Server Error",
  );
});
