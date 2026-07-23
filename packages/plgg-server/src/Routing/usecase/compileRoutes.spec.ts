import {
  test,
  check,
  all,
  toBe,
  toEqual,
  someThen,
  shouldBeSome,
  shouldBeNone,
  okThen,
} from "plgg-test";
import { none, pipe, ok } from "plgg";
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

  return check(
    lookupRoute(table, "GET", "/target"),
    someThen((m) =>
      all([
        check(m.route.pattern, toBe("/target")),
        check(m.params, toEqual({})),
      ]),
    ),
  );
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

  return all([
    check(
      lookupRoute(
        compileRoutes(first.routes),
        "GET",
        "/b",
      ),
      someThen((m) =>
        check(m.route.pattern, toBe("/b")),
      ),
    ),
    check(
      lookupRoute(
        compileRoutes(last.routes),
        "GET",
        "/b",
      ),
      someThen((m) =>
        check(m.route.pattern, toBe("/b")),
      ),
    ),
  ]);
});

test("param captures survive the compiled lookup", () => {
  const app = pipe(web(), get("/users/:id", h));
  return check(
    lookupRoute(
      compileRoutes(app.routes),
      "GET",
      "/users/42",
    ),
    someThen((m) =>
      check(m.params, toEqual({ id: "42" })),
    ),
  );
});

test("when a param route is registered before a colliding static route, registration order wins (param)", () => {
  const app = pipe(
    web(),
    get("/users/:id", h),
    get("/users/me", h),
  );
  return check(
    lookupRoute(
      compileRoutes(app.routes),
      "GET",
      "/users/me",
    ),
    someThen((m) =>
      all([
        check(
          m.route.pattern,
          toBe("/users/:id"),
        ),
        check(m.params, toEqual({ id: "me" })),
      ]),
    ),
  );
});

test("when a static route is registered before a colliding param route, the static wins", () => {
  const app = pipe(
    web(),
    get("/users/me", h),
    get("/users/:id", h),
  );
  return check(
    lookupRoute(
      compileRoutes(app.routes),
      "GET",
      "/users/me",
    ),
    someThen((m) =>
      all([
        check(
          m.route.pattern,
          toBe("/users/me"),
        ),
        check(m.params, toEqual({})),
      ]),
    ),
  );
});

test("when two dynamic routes both match, the first-registered wins", () => {
  const app = pipe(
    web(),
    get("/x/:a", h),
    get("/x/:b", h),
  );
  return check(
    lookupRoute(
      compileRoutes(app.routes),
      "GET",
      "/x/1",
    ),
    someThen((m) =>
      all([
        check(m.route.pattern, toBe("/x/:a")),
        check(m.params, toEqual({ a: "1" })),
      ]),
    ),
  );
});

test("lookup is indexed by method: a path registered only under another method does not match", () => {
  const app = pipe(web(), post("/things", h));
  return all([
    check(
      lookupRoute(
        compileRoutes(app.routes),
        "GET",
        "/things",
      ),
      shouldBeNone(),
    ),
    check(
      lookupRoute(
        compileRoutes(app.routes),
        "POST",
        "/things",
      ),
      shouldBeSome(),
    ),
  ]);
});

test("an unmatched path resolves to None", () => {
  const app = pipe(web(), get("/a", h), put("/a", h));
  return check(
    lookupRoute(
      compileRoutes(app.routes),
      "GET",
      "/missing",
    ),
    shouldBeNone(),
  );
});

test("the compiled table is memoized on the routes array identity", () => {
  const app = pipe(web(), get("/a", h));
  return check(
    compileRoutes(app.routes),
    toBe(compileRoutes(app.routes)),
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
  return check(
    await handle(app, {
      method: "GET",
      path: "/dup",
      query: {},
      headers: {},
      params: {},
      body: "",
      bytes: none(),
    }),
    okThen((r) => check(r.body, toBe("first"))),
  );
});
