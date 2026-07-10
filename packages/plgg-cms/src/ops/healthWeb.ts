import {
  type PromisedResult,
  ok,
  matchResult,
} from "plgg";
import {
  type Web,
  type Context,
  type HttpResponse,
  type HttpError,
  web,
  get,
  jsonResponse,
  statusOf,
} from "plggpress/framework";
import {
  type Db,
  sql,
  query,
} from "plgg-sql";

/**
 * The liveness/readiness endpoint (ticket 28, D5) the
 * cloudflared front + any process supervisor probe. `GET
 * /health` runs a trivial query against the served index; a
 * reachable DB → `200 {status:"ok"}`, an unreachable one →
 * `503 {status:"unavailable"}`. Never throws — a DB fault is a
 * degraded RESPONSE, not a crash, so the supervisor sees a
 * clean signal and the process can be restarted deliberately.
 */
export const healthWeb = (db: Db): Web =>
  get(
    "/health",
    (
      _c: Context,
    ): PromisedResult<
      HttpResponse,
      HttpError
    > =>
      query(db)(sql`SELECT 1 FROM documents LIMIT 1`).then(
        matchResult<
          ReadonlyArray<unknown>,
          unknown,
          import("plgg").Result<
            HttpResponse,
            HttpError
          >
        >(
          () =>
            ok(
              jsonResponse(
                { status: "unavailable" },
                statusOf(503),
              ),
            ),
          () =>
            ok(
              jsonResponse({ status: "ok" }),
            ),
        ),
      ),
  )(web());
