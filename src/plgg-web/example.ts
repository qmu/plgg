/**
 * plgg-web example — a small but real-world server (a tiny users API).
 *
 * Run it:
 *   npx tsx src/plgg-web/example.ts
 * then:
 *   curl localhost:3000/
 *   curl localhost:3000/users/7                       # found
 *   curl -i localhost:3000/users/999                  # 404 (no such user)
 *   curl "localhost:3000/search?q=plgg"
 *   curl -X POST localhost:3000/users -d '{"name":"Ada","email":"ada@x.io"}'   # 201
 *   curl -i -X POST localhost:3000/users -d 'not json'                          # 400
 *   curl -i -X POST localhost:3000/users -d '{"name":"A","email":"nope"}'       # 400 (invalid)
 *   curl -i localhost:3000/api/me                     # 401 (no token)
 *   curl localhost:3000/api/me -H 'authorization: Bearer secret'               # ok
 *
 * Everything is a `pipe` of data-last transformers; handlers return
 * `PromisedResult<HttpResponse, HttpError>`; lookups are `Option`; failures are
 * values, not exceptions.
 */
import {
  web,
  use,
  get,
  post,
  route,
  toFetch,
  serve,
  param,
  query,
  header,
  getState,
  setState,
  textResponse,
  jsonResponse,
  notFound,
  badRequest,
  unauthorized,
} from "plgg-web/index";
import {
  Obj,
  Option,
  Result,
  InvalidError,
  SoftStr,
  pipe,
  ok,
  err,
  fromNullable,
  mapOption,
  chainOption,
  getOr,
  okOr,
  toOption,
  mapResult,
  chainResult,
  tryCatch,
  cast,
  asObj,
  asSoftStr,
  refine,
  forProp,
} from "plgg";

// --- domain: validate an incoming user with plgg `cast` (no `as`) ---
type NewUser = Obj<{ name: SoftStr; email: SoftStr }>;

const asNewUser = (
  v: unknown,
): Result<NewUser, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("name", (x) =>
      cast(
        x,
        asSoftStr,
        refine(
          (s) => s.length >= 2,
          "name must be >= 2 chars",
        ),
      ),
    ),
    forProp("email", (x) =>
      cast(
        x,
        asSoftStr,
        refine(
          (s) => s.includes("@"),
          "email must contain @",
        ),
      ),
    ),
  );

// Safe JSON decode: lift the throwing `JSON.parse` into an `Option` via plgg's
// `tryCatch` (no hand-rolled try/catch).
const parseJson = (body: SoftStr): Option<unknown> =>
  pipe(
    tryCatch((s: SoftStr) => JSON.parse(s))(body),
    toOption,
  );

// --- a fake async "store" (stands in for a DB) ---
const store: Readonly<Record<string, NewUser>> = {
  "7": { name: "Ada", email: "ada@x.io" },
};
const findUser = (id: SoftStr): Option<NewUser> =>
  fromNullable(store[id]);

// The /api group. NOTE: plgg-web has no group-scoped middleware — a `use()`
// inside this sub-app would leak to the whole app once mounted (see analysis).
// So the bearer-token gate is an inline guard. A missing/invalid token is a
// failure value: `err(unauthorized(...))` folds to 401 at the seam.
const api = pipe(
  web(),
  get("/me", async (c) =>
    pipe(c, header("authorization"), getOr("")) ===
    "Bearer secret"
      ? ok(jsonResponse({ me: "ada" }))
      : err(unauthorized("Unauthorized")),
  ),
);

const app = pipe(
  web(),

  // request-id + logging; threads the id downstream via immutable state.
  use(async (c, next) =>
    pipe(
      Math.random().toString(36).slice(2, 8),
      (rid) => {
        console.log(
          `[${rid}] -> ${c.req.method} ${c.req.path}`,
        );
        return next(pipe(c, setState("rid", rid)));
      },
    ),
  ),

  // reads the request id the middleware injected via immutable state
  get("/", async (c) =>
    pipe(
      c,
      getState("rid"),
      mapOption((rid) => `ok (req ${rid})`),
      getOr("ok"),
      textResponse,
      ok,
    ),
  ),

  // path param -> async-ish store lookup, folded to 404. `chainOption` flattens
  // "param present" and "user exists" into one `Option`.
  get("/users/:id", async (c) =>
    pipe(
      c,
      param("id"),
      chainOption(findUser),
      mapOption((user) => jsonResponse(user)),
      okOr(notFound(c.req.path)),
    ),
  ),

  // POST body: decode JSON, validate shape, build 201 — each failure becomes a
  // 400. `chainResult` sequences the two fallible steps in the HttpError channel.
  post("/users", async (c) =>
    pipe(
      c.req.body,
      parseJson,
      okOr(badRequest("body must be JSON")),
      chainResult((v) =>
        pipe(
          asNewUser(v),
          toOption,
          okOr(
            badRequest(
              "name (>=2) and a valid email are required",
            ),
          ),
        ),
      ),
      mapResult((user) =>
        jsonResponse({ created: user }, 201),
      ),
    ),
  ),

  get("/search", async (c) =>
    pipe(
      c,
      query("q"),
      mapOption((q) => `searching: ${q}`),
      getOr("no query"),
      textResponse,
      ok,
    ),
  ),

  // mount the authenticated sub-app under /api
  route("/api", api),
);

pipe(
  app,
  toFetch,
  serve({ port: 3000 }, () =>
    console.log("listening on http://localhost:3000"),
  ),
);
