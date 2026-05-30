import { test, expect } from "vitest";
import {
  isSome,
  isNone,
  isOk,
  none,
  pipe,
  ok,
} from "plgg";
import {
  web,
  get,
  post,
  put,
  handle,
  textResponse,
  compileRoutes,
  lookupRoute,
  Handler,
} from "plgg-server/index";

const h: Handler = async () =>
  pipe("x", textResponse, ok);

test("a static path resolves to its own route regardless of how many unrelated routes precede it", () => {
  const many = Array.from(
    { length: 50 },
    (_v, i) => i,
  ).reduce(
    (app, i) => get(`/noise/${i}`, h)(app),
    web(),
  );
  const app = get("/target", h)(many);
  const table = compileRoutes(app.routes);

  const hit = lookupRoute(table, "GET", "/target");
  expect(isSome(hit)).toBe(true);
  if (isSome(hit)) {
    expect(hit.content.route.pattern).toBe("/target");
    expect(hit.content.params).toEqual({});
  }
});

test("static lookup is order-independent: same result whether registered first or last", () => {
  const first = pipe(
    web(),
    get("/a", h),
    get("/b", h),
    get("/c", h),
  );
  const last = pipe(
    web(),
    get("/c", h),
    get("/b", h),
    get("/a", h),
  );

  const fromFirst = lookupRoute(
    compileRoutes(first.routes),
    "GET",
    "/b",
  );
  const fromLast = lookupRoute(
    compileRoutes(last.routes),
    "GET",
    "/b",
  );
  expect(isSome(fromFirst)).toBe(true);
  expect(isSome(fromLast)).toBe(true);
  if (isSome(fromFirst) && isSome(fromLast)) {
    expect(fromFirst.content.route.pattern).toBe("/b");
    expect(fromLast.content.route.pattern).toBe("/b");
  }
});

test("param captures survive the compiled lookup", () => {
  const app = pipe(web(), get("/users/:id", h));
  const hit = lookupRoute(
    compileRoutes(app.routes),
    "GET",
    "/users/42",
  );
  expect(isSome(hit)).toBe(true);
  if (isSome(hit)) {
    expect(hit.content.params).toEqual({ id: "42" });
  }
});

test("when a param route is registered before a colliding static route, registration order wins (param)", () => {
  const app = pipe(
    web(),
    get("/users/:id", h),
    get("/users/me", h),
  );
  const hit = lookupRoute(
    compileRoutes(app.routes),
    "GET",
    "/users/me",
  );
  expect(isSome(hit)).toBe(true);
  if (isSome(hit)) {
    expect(hit.content.route.pattern).toBe("/users/:id");
    expect(hit.content.params).toEqual({ id: "me" });
  }
});

test("when a static route is registered before a colliding param route, the static wins", () => {
  const app = pipe(
    web(),
    get("/users/me", h),
    get("/users/:id", h),
  );
  const hit = lookupRoute(
    compileRoutes(app.routes),
    "GET",
    "/users/me",
  );
  expect(isSome(hit)).toBe(true);
  if (isSome(hit)) {
    expect(hit.content.route.pattern).toBe("/users/me");
    expect(hit.content.params).toEqual({});
  }
});

test("when two dynamic routes both match, the first-registered wins", () => {
  const app = pipe(
    web(),
    get("/x/:a", h),
    get("/x/:b", h),
  );
  const hit = lookupRoute(
    compileRoutes(app.routes),
    "GET",
    "/x/1",
  );
  expect(isSome(hit)).toBe(true);
  if (isSome(hit)) {
    expect(hit.content.route.pattern).toBe("/x/:a");
    expect(hit.content.params).toEqual({ a: "1" });
  }
});

test("lookup is indexed by method: a path registered only under another method does not match", () => {
  const app = pipe(web(), post("/things", h));
  expect(
    isNone(
      lookupRoute(
        compileRoutes(app.routes),
        "GET",
        "/things",
      ),
    ),
  ).toBe(true);
  expect(
    isSome(
      lookupRoute(
        compileRoutes(app.routes),
        "POST",
        "/things",
      ),
    ),
  ).toBe(true);
});

test("an unmatched path resolves to None", () => {
  const app = pipe(web(), get("/a", h), put("/a", h));
  expect(
    isNone(
      lookupRoute(
        compileRoutes(app.routes),
        "GET",
        "/missing",
      ),
    ),
  ).toBe(true);
});

test("the compiled table is memoized on the routes array identity", () => {
  const app = pipe(web(), get("/a", h));
  expect(compileRoutes(app.routes)).toBe(
    compileRoutes(app.routes),
  );
});

test("the first of two identical static routes (same method+path) wins", async () => {
  const app = pipe(
    web(),
    get("/dup", async () =>
      pipe("first", textResponse, ok),
    ),
    get("/dup", async () =>
      pipe("second", textResponse, ok),
    ),
  );
  const result = await handle(app, {
    method: "GET",
    path: "/dup",
    query: {},
    headers: {},
    params: {},
    body: "",
    bytes: none(),
  });
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content.body).toBe("first");
  }
});
