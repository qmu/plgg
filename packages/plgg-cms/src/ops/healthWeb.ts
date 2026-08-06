import {
  type Result,
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
import { type Db, sql, query } from "plgg-sql";

/** The `COUNT(*)` of a probe row, or 0 when it will not read. */
const countOf = (
  rows: ReadonlyArray<unknown>,
): number => {
  const first: unknown = rows[0];
  return typeof first === "object" &&
    first !== null &&
    "n" in first &&
    typeof first.n === "number"
    ? first.n
    : 0;
};

/**
 * The liveness/readiness endpoint (ticket 28, D5) the
 * cloudflared front + any process supervisor probe. `GET
 * /health` counts the served index's documents; a reachable
 * DB → `200 {status:"ok", documents:N}`, an unreachable one
 * → `503 {status:"unavailable"}`. Never throws — a DB fault
 * is a degraded RESPONSE, not a crash, so the supervisor
 * sees a clean signal and the process can be restarted
 * deliberately.
 *
 * `documents` is reported rather than merely probed because
 * a schema-only index answers `SELECT 1` exactly like a
 * filled one: an empty corpus used to be invisible from
 * outside and surfaced only as empty search results. The
 * count makes "serving, but with nothing indexed" a state a
 * monitor can see.
 */
export const healthWeb = (db: Db): Web =>
  get(
    "/health",
    (
      _c: Context,
    ): PromisedResult<HttpResponse, HttpError> =>
      query(db)(
        sql`SELECT COUNT(*) AS n FROM documents`,
      ).then(
        matchResult<
          ReadonlyArray<unknown>,
          unknown,
          Result<HttpResponse, HttpError>
        >(
          () =>
            ok(
              jsonResponse(
                { status: "unavailable" },
                statusOf(503),
              ),
            ),
          (rows: ReadonlyArray<unknown>) =>
            ok(
              jsonResponse({
                status: "ok",
                documents: countOf(rows),
              }),
            ),
        ),
      ),
  )(web());
