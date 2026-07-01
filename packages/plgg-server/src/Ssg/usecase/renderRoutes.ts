import {
  SoftStr,
  Result,
  PromisedResult,
  Defect,
  ok,
  err,
  isOk,
  isSoftStr,
  mapErr,
  mapResult,
  proc,
  none,
} from "plgg";
import {
  Web,
  HttpRequest,
  HttpResponse,
  HttpError,
  handle,
} from "plgg-server/index";
import {
  SsgPage,
  SsgError,
  ssgPage,
  renderFailed,
  nonOkStatus,
  nonHtmlBody,
} from "plgg-server/Ssg/model/Ssg";

/**
 * The synthetic GET the crawler feeds to `handle`. The literal already
 * satisfies {@link HttpRequest} — `"GET"` is a `Method` and `none()` the empty
 * `bytes`; no cast.
 */
export const getRequest = (
  path: SoftStr,
): HttpRequest => ({
  method: "GET",
  path,
  query: {},
  headers: {},
  params: {},
  body: "",
  bytes: none(),
});

/**
 * The numeric status code of a response.
 */
const statusCode = (
  response: HttpResponse,
): number => response.status.content;

/**
 * Folds a 2xx string-bodied response into an {@link SsgPage}; a non-2xx status
 * or a non-string (`Bytes`/`Stream`) body becomes a typed {@link SsgError}.
 * `isSoftStr` narrows the body's string arm — no cast.
 */
export const toPage =
  (path: SoftStr) =>
  (
    response: HttpResponse,
  ): Result<SsgPage, SsgError> =>
    statusCode(response) >= 200 &&
    statusCode(response) < 300
      ? isSoftStr(response.body)
        ? ok(ssgPage(path, response.body))
        : err(nonHtmlBody(path))
      : err(
          nonOkStatus(path, response.status),
        );

/**
 * Renders one crawl path through the real router. `proc`-native now that the
 * error model is data: the `handle` step lifts its `HttpError` into an
 * {@link SsgError} (`renderFailed`) so the channel stays domain-typed, and
 * `toPage` folds the response. `proc` adds {@link Defect} for any unexpected
 * throw.
 */
export const renderPath =
  (app: Web) =>
  (
    path: SoftStr,
  ): PromisedResult<SsgPage, SsgError | Defect> =>
    proc(
      getRequest(path),
      (req: HttpRequest) =>
        handle(app, req).then(
          mapErr(
            (error: HttpError): SsgError =>
              renderFailed(path, error),
          ),
        ),
      toPage(path),
    );

/**
 * Renders every crawl path in order, short-circuiting to the first error
 * (STRICT). The accumulator is itself a `PromisedResult`, so a single failed
 * page makes the whole array `err`.
 */
export const renderRoutes =
  (app: Web) =>
  (
    paths: ReadonlyArray<SoftStr>,
  ): PromisedResult<
    ReadonlyArray<SsgPage>,
    SsgError | Defect
  > =>
    paths.reduce(
      (
        acc: PromisedResult<
          ReadonlyArray<SsgPage>,
          SsgError | Defect
        >,
        path: SoftStr,
      ): PromisedResult<
        ReadonlyArray<SsgPage>,
        SsgError | Defect
      > =>
        acc.then(
          (
            soFar: Result<
              ReadonlyArray<SsgPage>,
              SsgError | Defect
            >,
          ): PromisedResult<
            ReadonlyArray<SsgPage>,
            SsgError | Defect
          > =>
            isOk(soFar)
              ? renderPath(app)(path).then(
                  mapResult(
                    (
                      page: SsgPage,
                    ): ReadonlyArray<SsgPage> => [
                      ...soFar.content,
                      page,
                    ],
                  ),
                )
              : Promise.resolve(soFar),
        ),
      Promise.resolve(
        ok<ReadonlyArray<SsgPage>>([]),
      ),
    );
