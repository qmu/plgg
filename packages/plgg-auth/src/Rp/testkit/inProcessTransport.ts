import {
  type Result,
  ok,
  err,
  matchResult,
} from "plgg";
import {
  type Web,
  type HttpRequest,
  type HttpResponse,
  type HttpError,
  handle,
} from "plgg-server";
import { type RpTransport } from "plgg-auth/Rp/RpTransport";
import {
  type RpError,
  transportError,
} from "plgg-auth/Rp/RpError";

/**
 * An {@link RpTransport} that runs against an OP {@link Web}
 * IN PROCESS via `handle(op, req)` — no sockets. Turns the
 * OP's own routes into the RP's transport, so `beginLogin` +
 * `completeLogin` exercise the real provider end to end in a
 * test. An OP handler that errors (an `HttpError` `Err`) maps
 * to a `transportError`; ordinary non-200 OAuth responses
 * come back as `Ok` for the caller to inspect.
 */
export const inProcessTransport =
  (op: Web): RpTransport =>
  (
    req: HttpRequest,
  ): Promise<Result<HttpResponse, RpError>> =>
    handle(op, req).then(
      matchResult<
        HttpResponse,
        HttpError,
        Result<HttpResponse, RpError>
      >(
        (e: HttpError) =>
          err(
            transportError(
              `in-process OP error: ${e.__tag}`,
            ),
          ),
        (res: HttpResponse) => ok(res),
      ),
    );
