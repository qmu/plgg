import { isOk } from "plgg";
import {
  Web,
  toHttpRequest,
  toNativeResponse,
  httpErrorToResponse,
  handle,
} from "plgg-http-router/index";

/**
 * A Web-standard request handler: the shape an HTTP server (e.g. {@link serve})
 * consumes. This is the only place platform `Request`/`Response` types surface.
 */
export type Fetch = (
  request: Request,
) => Promise<Response>;

/**
 * The seam: adapts a {@link Web} into a {@link Fetch}. It parses the native
 * `Request` into an `HttpRequest`, runs the plgg-native {@link handle}, then
 * folds the outcome — success or `HttpError` — into a native `Response`.
 * Data-last so it composes: `pipe(app, toFetch, serve(...))`.
 */
export const toFetch =
  (app: Web): Fetch =>
  (request: Request): Promise<Response> =>
    toHttpRequest(request)
      .then((parsed) =>
        isOk(parsed)
          ? handle(app, parsed.content)
          : parsed,
      )
      .then((result) =>
        toNativeResponse(
          isOk(result)
            ? result.content
            : httpErrorToResponse(result.content),
        ),
      );
