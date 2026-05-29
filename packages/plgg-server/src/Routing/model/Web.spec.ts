import { test, expect } from "vitest";
import {
  pipe,
  isOk,
  ok,
  err,
  none,
  mapOption,
  getOr,
  matchOption,
} from "plgg";
import {
  web,
  use,
  on,
  get,
  post,
  put,
  patch,
  del,
  head,
  options,
  route,
  handle,
  toFetch,
  param,
  query,
  getState,
  setState,
  textResponse,
  jsonResponse,
  Middleware,
  internalError,
} from "plgg-server/index";

const GET = (path: string) =>
  new Request(`http://x${path}`);

test("routes by method and path, returning the handler response", async () => {
  const app = pipe(
    web(),
    get("/", async () =>
      pipe("home", textResponse, ok),
    ),
    get("/users/:id", async (c) =>
      pipe(
        c,
        param("id"),
        matchOption(
          () => null,
          (id) => id,
        ),
        (id) => jsonResponse({ id }),
        ok,
      ),
    ),
  );
  const send = toFetch(app);

  const home = await send(GET("/"));
  expect(home.status).toBe(200);
  await expect(home.text()).resolves.toBe("home");

  const user = await send(GET("/users/9"));
  await expect(user.json()).resolves.toEqual({
    id: "9",
  });
});

test("handle() is the plgg-native entry, returning a Result", async () => {
  const app = pipe(
    web(),
    get("/ping", async () =>
      pipe("pong", textResponse, ok),
    ),
  );
  const result = await handle(app, {
    method: "GET",
    path: "/ping",
    query: {},
    headers: {},
    params: {},
    body: "",
    bytes: none(),
  });
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content.body).toBe("pong");
  }
});

test("unmatched path yields 404", async () => {
  const app = pipe(
    web(),
    get("/a", async () => pipe("a", textResponse, ok)),
  );
  const res = await toFetch(app)(GET("/missing"));
  expect(res.status).toBe(404);
});

test("matched path with wrong method yields 405 and a deduped Allow header", async () => {
  const app = pipe(
    web(),
    get("/x", async () => pipe("g", textResponse, ok)),
    get("/x", async () => pipe("g2", textResponse, ok)),
    put("/x", async () => pipe("p", textResponse, ok)),
  );
  const res = await toFetch(app)(
    new Request("http://x/x", { method: "PATCH" }),
  );
  expect(res.status).toBe(405);
  expect(res.headers.get("allow")).toBe("GET, PUT");
});

test("an unsupported request method yields 501", async () => {
  const app = pipe(
    web(),
    get("/x", async () => pipe("x", textResponse, ok)),
  );
  const res = await toFetch(app)(
    new Request("http://x/x", { method: "PURGE" }),
  );
  expect(res.status).toBe(501);
});

test("query parameters are readable from the context", async () => {
  const app = pipe(
    web(),
    get("/search", async (c) =>
      pipe(
        c,
        query("q"),
        getOr("none"),
        textResponse,
        ok,
      ),
    ),
  );
  const res = await toFetch(app)(
    GET("/search?q=plgg"),
  );
  await expect(res.text()).resolves.toBe("plgg");
});

test("async handler can read a JSON body via the request model", async () => {
  const app = pipe(
    web(),
    post("/echo", async (c) =>
      pipe(
        { received: c.req.body },
        jsonResponse,
        ok,
      ),
    ),
  );
  const res = await toFetch(app)(
    new Request("http://x/echo", {
      method: "POST",
      body: "hello",
    }),
  );
  await expect(res.json()).resolves.toEqual({
    received: "hello",
  });
});

test("middleware runs in onion order around the handler", async () => {
  const order: Array<string> = [];
  const tag =
    (label: string): Middleware =>
    async (_c, next) => {
      order.push(`${label}-in`);
      const res = await next();
      order.push(`${label}-out`);
      return res;
    };

  const app = pipe(
    web(),
    use(tag("m1")),
    use(tag("m2")),
    get("/", async () => {
      order.push("handler");
      return pipe("ok", textResponse, ok);
    }),
  );

  await toFetch(app)(GET("/"));
  expect(order).toEqual([
    "m1-in",
    "m2-in",
    "handler",
    "m2-out",
    "m1-out",
  ]);
});

test("middleware threads enriched state into the handler", async () => {
  const app = pipe(
    web(),
    use(async (c, next) =>
      next(pipe(c, setState("user", "alice"))),
    ),
    get("/", async (c) =>
      pipe(
        c,
        getState("user"),
        mapOption(String),
        getOr("anon"),
        textResponse,
        ok,
      ),
    ),
  );
  const res = await toFetch(app)(GET("/"));
  await expect(res.text()).resolves.toBe("alice");
});

test("middleware may transform a successful response", async () => {
  const app = pipe(
    web(),
    use(async (_c, next) => {
      const res = await next();
      return isOk(res)
        ? ok({
            ...res.content,
            headers: {
              ...res.content.headers,
              "x-mw": "1",
            },
          })
        : res;
    }),
    get("/", async () => pipe("hi", textResponse, ok)),
  );
  const res = await toFetch(app)(GET("/"));
  expect(res.headers.get("x-mw")).toBe("1");
});

test("a handler returning Err is folded into a response", async () => {
  const app = pipe(
    web(),
    get("/boom", async () =>
      err(internalError("explicit")),
    ),
  );
  const res = await toFetch(app)(GET("/boom"));
  expect(res.status).toBe(500);
});

test("a throwing handler becomes 500", async () => {
  const app = pipe(
    web(),
    get("/throw", async () => {
      throw new Error("kaboom");
    }),
  );
  const res = await toFetch(app)(GET("/throw"));
  expect(res.status).toBe(500);
});

test("every verb helper and the generic `on` register routes", async () => {
  const app = pipe(
    web(),
    post("/r", async () => pipe("post", textResponse, ok)),
    put("/r", async () => pipe("put", textResponse, ok)),
    patch("/r", async () =>
      pipe("patch", textResponse, ok),
    ),
    del("/r", async () =>
      pipe("delete", textResponse, ok),
    ),
    head("/r", async () => pipe("head", textResponse, ok)),
    options("/r", async () =>
      pipe("options", textResponse, ok),
    ),
    on("GET", "/r", async () =>
      pipe("get", textResponse, ok),
    ),
  );
  const send = toFetch(app);

  for (const method of [
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
    "GET",
  ]) {
    const res = await send(
      new Request("http://x/r", { method }),
    );
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe(
      method.toLowerCase(),
    );
  }
  expect(app.routes.length).toBe(7);
});

test("route() mounts a sub-app under a base path and merges middleware", async () => {
  let mwRan = false;
  const api = pipe(
    web(),
    use(async (_c, next) => {
      mwRan = true;
      return next();
    }),
    get("/list", async () =>
      pipe("list", textResponse, ok),
    ),
    get("/items/:id", async (c) =>
      pipe(c, param("id"), getOr(""), textResponse, ok),
    ),
  );

  const app = pipe(web(), route("/api", api));
  const send = toFetch(app);

  const list = await send(GET("/api/list"));
  expect(list.status).toBe(200);
  await expect(list.text()).resolves.toBe("list");
  expect(mwRan).toBe(true);

  const item = await send(GET("/api/items/5"));
  await expect(item.text()).resolves.toBe("5");
});

test("group middleware runs only under its mounted prefix, not app-wide", async () => {
  const seen: Array<string> = [];
  const guard: Middleware = async (c, next) => {
    seen.push(c.req.path);
    return next();
  };
  const api = pipe(
    web(),
    use(guard),
    get("/me", async () => pipe("me", textResponse, ok)),
  );
  const app = pipe(
    web(),
    get("/", async () => pipe("root", textResponse, ok)),
    route("/api", api),
  );
  const send = toFetch(app);

  const root = await send(GET("/"));
  await expect(root.text()).resolves.toBe("root");
  expect(seen).toEqual([]); // guard did NOT leak to /

  await send(GET("/api/me"));
  expect(seen).toEqual(["/api/me"]); // guard ran for the group
});

test("top-level use() stays global across grouped and ungrouped routes", async () => {
  const hits: Array<string> = [];
  const log: Middleware = async (c, next) => {
    hits.push(c.req.path);
    return next();
  };
  const api = pipe(
    web(),
    get("/me", async () => pipe("me", textResponse, ok)),
  );
  const app = pipe(
    web(),
    use(log),
    get("/", async () => pipe("root", textResponse, ok)),
    route("/api", api),
  );
  const send = toFetch(app);

  await send(GET("/"));
  await send(GET("/api/me"));
  expect(hits).toEqual(["/", "/api/me"]);
});

test("global and group middleware compose in onion order (global outer, group inner)", async () => {
  const order: Array<string> = [];
  const tag =
    (label: string): Middleware =>
    async (_c, next) => {
      order.push(`${label}-in`);
      const res = await next();
      order.push(`${label}-out`);
      return res;
    };
  const api = pipe(
    web(),
    use(tag("group")),
    get("/x", async () => {
      order.push("handler");
      return pipe("x", textResponse, ok);
    }),
  );
  const app = pipe(
    web(),
    use(tag("global")),
    route("/api", api),
  );

  await toFetch(app)(GET("/api/x"));
  expect(order).toEqual([
    "global-in",
    "group-in",
    "handler",
    "group-out",
    "global-out",
  ]);
});

test("nested route() groups stack their middleware outer-to-inner", async () => {
  const order: Array<string> = [];
  const tag =
    (label: string): Middleware =>
    async (_c, next) => {
      order.push(`${label}-in`);
      const res = await next();
      order.push(`${label}-out`);
      return res;
    };
  const inner = pipe(
    web(),
    use(tag("inner")),
    get("/leaf", async () =>
      pipe("leaf", textResponse, ok),
    ),
  );
  const outer = pipe(
    web(),
    use(tag("outer")),
    route("/in", inner),
  );
  const app = pipe(web(), route("/out", outer));

  await toFetch(app)(GET("/out/in/leaf"));
  expect(order).toEqual([
    "outer-in",
    "inner-in",
    "inner-out",
    "outer-out",
  ]);
});
