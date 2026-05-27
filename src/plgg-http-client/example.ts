/**
 * plgg-http-client example — calls the plgg-http-router example server.
 *
 * In one terminal, start the server:
 *   npx tsx src/plgg-http-router/example.ts
 * then run this client:
 *   npx tsx src/plgg-http-client/example.ts
 *
 * Everything is a value: `request`/`get`/`post` return
 * `PromisedResult<HttpResponse, ClientError>`; a transport failure is a
 * `NetworkError`, a non-2xx status is an ordinary `HttpResponse`, and decoding
 * the body into a typed value is a `Result` via `decodeJsonBody`.
 */
import {
  Obj,
  Result,
  InvalidError,
  SoftStr,
  pipe,
  match,
  pattern,
  matchResult,
  cast,
  asObj,
  asSoftStr,
  refine,
  forProp,
  encodeJson,
} from "plgg";
import {
  get,
  post,
  decodeJsonBody,
  ClientError,
} from "plgg-http-client/index";
import { HttpResponse } from "plgg-http-router";

// --- domain: validate the user the server returns, with plgg `cast` (no `as`) ---
type User = Obj<{ name: SoftStr; email: SoftStr }>;

const asUser = (
  value: unknown,
): Result<User, InvalidError> =>
  cast(
    value,
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

const BASE = "http://localhost:3000";

// Reports a finished call: transport failures, the HTTP status, and the decoded
// body — each handled as a value rather than a thrown exception.
const report =
  (label: SoftStr) =>
  (result: Result<HttpResponse, ClientError>): void =>
    pipe(
      result,
      matchResult(
        // Exhaustively fold the ClientError vocabulary with plgg `match`: each
        // arm receives the box narrowed to its tag (typed `.content`), and the
        // set must cover every variant — leaving one out is a compile error.
        (error: ClientError) =>
          match(error)(
            [
              pattern("NetworkError")(),
              (e) =>
                console.error(
                  `${label}: network error — ${e.content}`,
                ),
            ],
            [
              pattern("NotFound")(),
              (e) =>
                console.error(
                  `${label}: not found — ${e.content}`,
                ),
            ],
            [
              pattern("MethodNotAllowed")(),
              (e) =>
                console.error(
                  `${label}: method not allowed; allowed: ${e.content.join(", ")}`,
                ),
            ],
            [
              pattern("BadRequest")(),
              (e) =>
                console.error(
                  `${label}: bad request — ${e.content}`,
                ),
            ],
            [
              pattern("Unsupported")(),
              (e) =>
                console.error(
                  `${label}: unsupported — ${e.content}`,
                ),
            ],
            [
              pattern("Unauthorized")(),
              (e) =>
                console.error(
                  `${label}: unauthorized — ${e.content}`,
                ),
            ],
            [
              pattern("Forbidden")(),
              (e) =>
                console.error(
                  `${label}: forbidden — ${e.content}`,
                ),
            ],
            [
              pattern("StatusError")(),
              (e) =>
                console.error(
                  `${label}: status ${e.content.status.content} — ${e.content.message}`,
                ),
            ],
            [
              pattern("InternalError")(),
              (e) =>
                console.error(
                  `${label}: internal error — ${e.content}`,
                ),
            ],
          ),
        (response: HttpResponse) =>
          pipe(
            response,
            decodeJsonBody(asUser),
            matchResult(
              (decodeError: InvalidError) =>
                console.log(
                  `${label}: status ${response.status.content}, body not a User (${decodeError.message})`,
                ),
              (user: User) =>
                console.log(
                  `${label}: status ${response.status.content}, user`,
                  user,
                ),
            ),
          ),
      ),
    );

const main = async (): Promise<void> => {
  // GET an existing user → 200 + a JSON User the server returns.
  pipe(
    await get(`${BASE}/users/7`),
    report("GET /users/7"),
  );

  // GET a missing user → 404, returned as a valid HttpResponse (not an error).
  pipe(
    await get(`${BASE}/users/999`),
    report("GET /users/999"),
  );

  // POST a new user. Encode the JSON body with plgg's codec, set content-type.
  await pipe(
    encodeJson({ name: "Grace", email: "grace@x.io" }),
    matchResult(
      (error: InvalidError): Promise<void> =>
        Promise.resolve(
          console.error(
            `POST /users: could not encode body — ${error.message}`,
          ),
        ),
      (body: SoftStr): Promise<void> =>
        post(`${BASE}/users`, {
          body,
          headers: {
            "content-type": "application/json",
          },
        }).then(report("POST /users")),
    ),
  );
};

main();
