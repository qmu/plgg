import {
  PromisedResult,
  SoftStr,
  Dict,
  ok,
  err,
  pipe,
  some,
  none,
  toOption,
  fromNullable,
  matchOption,
} from "plgg";
import {
  HttpRequest,
  HttpError,
  Method,
  asMethod,
  unsupported,
} from "plgg-server/index";

/**
 * Whether a body should be ingested as text. A missing content-type defaults to
 * text (the historical behavior); textual media types (`text/*`, anything
 * JSON/XML/form-encoded/JavaScript) read as text, everything else as bytes.
 */
const isTextualBody = (
  contentType: SoftStr | undefined,
): boolean =>
  pipe(
    fromNullable(contentType),
    matchOption(
      () => true,
      (ct: SoftStr) =>
        pipe(
          ct.toLowerCase(),
          (lc) =>
            lc.startsWith("text/") ||
            lc.includes("json") ||
            lc.includes("xml") ||
            lc.includes("x-www-form-urlencoded") ||
            lc.includes("javascript"),
        ),
    ),
  );

/**
 * Lowercases header keys into a plgg `Dict`.
 */
const toHeaders = (
  request: Request,
): Dict<string, SoftStr> =>
  Object.fromEntries(
    [...request.headers].map(
      ([key, value]): [string, string] => [
        key.toLowerCase(),
        value,
      ],
    ),
  );

/**
 * Converts a Web-standard `Request` into a plgg-native {@link HttpRequest}.
 *
 * This is one of the two seam functions where native Web types are touched;
 * raw values are lifted into plgg types immediately — the method through
 * `asMethod` (an unsupported method folds to a typed {@link HttpError}), the
 * header/query maps through `Object.fromEntries`. A textual body is decoded to
 * `body`; a binary body is surfaced as `bytes` (with `body` left empty).
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
        pipe(
          { url: new URL(request.url), headers: toHeaders(request) },
          ({ url, headers }) =>
            isTextualBody(headers["content-type"])
              ? request.text().then((body) =>
                  ok({
                    method,
                    path: url.pathname,
                    query: Object.fromEntries(
                      url.searchParams,
                    ),
                    headers,
                    params: {},
                    body,
                    bytes: none(),
                  }),
                )
              : request.arrayBuffer().then((buffer) =>
                  ok({
                    method,
                    path: url.pathname,
                    query: Object.fromEntries(
                      url.searchParams,
                    ),
                    headers,
                    params: {},
                    body: "",
                    bytes: some(new Uint8Array(buffer)),
                  }),
                ),
        ),
    ),
  );
