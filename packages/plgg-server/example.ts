/**
 * plgg-server example — a small but real-world server (a tiny users API).
 *
 * Run it:
 *   npx tsx src/plgg-server/example.ts
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
} from "plgg-server/index";
import { serve } from "plgg-server/node";
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
  mapResult,
  mapErr,
  chainResult,
  decodeJson,
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

// --- a fake async "store" (stands in for a DB) ---
const store: Readonly<Record<string, NewUser>> = {
  "7": { name: "Ada", email: "ada@x.io" },
};
const findUser = (id: SoftStr): Option<NewUser> =>
  fromNullable(store[id]);

// The /api group. Its `use(...)` guard is scoped to this sub-app: once mounted
// under `/api`, it runs for every `/api` route and nowhere else (it does NOT
// leak to `/`). A missing/invalid bearer token short-circuits the onion with
// `err(unauthorized(...))`, which folds to 401 at the seam.
const api = pipe(
  web(),
  use(async (c, next) =>
    pipe(c, header("authorization"), getOr("")) ===
    "Bearer secret"
      ? next()
      : err(unauthorized("Unauthorized")),
  ),
  get("/me", async () =>
    ok(jsonResponse({ me: "ada" })),
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
  // 400 that carries the *real* reason. `decodeJson` and `asNewUser` both yield
  // `Result<_, InvalidError>`; `mapErr(badRequest)` lifts each message into the
  // HttpError channel without discarding it, and `chainResult` sequences them.
  post("/users", async (c) =>
    pipe(
      c.req.body,
      decodeJson,
      mapErr((e: InvalidError) => badRequest(e.message)),
      chainResult((v) =>
        pipe(
          asNewUser(v),
          mapErr((e: InvalidError) =>
            badRequest(e.message),
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
