import {
  PromisedResult,
  ok,
  err,
  pipe,
  toOption,
  matchOption,
} from "plgg";
import {
  HttpRequest,
  HttpError,
  Method,
  asMethod,
  unsupported,
} from "plgg-web/index";

/**
 * Converts a Web-standard `Request` into a plgg-native {@link HttpRequest}.
 *
 * This is one of the two seam functions where native Web types are touched;
 * raw values are lifted into plgg types immediately — the method through
 * `asMethod` (an unsupported method folds to a typed {@link HttpError}), the
 * header/query maps through `Object.fromEntries`.
 */
export const toHttpRequest = (
  request: Request,
): PromisedResult<HttpRequest, HttpError> =>
  pipe(
    asMethod(request.method),
    toOption,
    matchOption<
      Method,
      PromisedResult<HttpRequest, HttpError>
    >(
      () =>
        Promise.resolve(
          err(
            unsupported(
              `${request.method} is not supported`,
            ),
          ),
        ),
      (method) =>
        pipe(new URL(request.url), (url) =>
          request.text().then((body) =>
            ok({
              method,
              path: url.pathname,
              query: Object.fromEntries(
                url.searchParams,
              ),
              headers: Object.fromEntries(
                [...request.headers].map(
                  ([key, value]): [string, string] => [
                    key.toLowerCase(),
                    value,
                  ],
                ),
              ),
              params: {},
              body,
            }),
          ),
        ),
    ),
  );
