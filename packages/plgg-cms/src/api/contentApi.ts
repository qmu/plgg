import {
  type SoftStr,
  type Option,
  type Result,
  type PromisedResult,
  type InvalidError,
  type Defect,
  ok,
  err,
  isErr,
  pipe,
  matchResult,
  matchOption,
} from "plgg";
import {
  type Web,
  type Handler,
  type Context,
  type HttpResponse,
  type HttpError,
  web,
  get,
  param,
  query,
  jsonResponse,
  internalError,
  badRequest,
  notFound,
} from "plggpress/framework";
import {
  type Db,
  type SqlError,
  type Document,
  type QueryParams,
  type Embedder,
  listCollections,
  listCollection,
  getDocument,
  ragSearch,
  asListQuery,
} from "plgg-cms/content";

/** The query functions' error channel. */
type ApiError = SqlError | InvalidError | Defect;

/** The message of any query error (all carry `content.message`). */
const errMessage = (e: ApiError): SoftStr =>
  e.content.message;

/**
 * The read-only, PUBLIC delivery API (D4/D11) — a thin
 * `plgg-server` {@link Web} adapter over plgg-cms/content's
 * in-process query functions, mounted at `/api` on the
 * served plggpress instance. GET only, the same content the
 * SSG already publishes, so it needs no authz yet (tickets
 * 19/20 add the guard at the mount seam). Every handler is
 * `extract params → call the typed query fn → jsonResponse`;
 * a query error folds to a 500, a missing/invalid parameter
 * to a 400, an absent document to a 404.
 */
export const contentApi = (
  db: Db,
  embedder: Option<Embedder>,
): Web =>
  pipe(
    web(),
    get("/collections", collectionsRoute(db)),
    get(
      "/collections/:name",
      listRoute(db),
    ),
    get("/document", documentRoute(db)),
    get(
      "/search",
      searchRoute(db, embedder),
    ),
  );

type ApiOk<T> = PromisedResult<T, ApiError>;

/** Fold a query result into a JSON 200 or a 500. */
const respond = <T>(
  p: ApiOk<T>,
): PromisedResult<HttpResponse, HttpError> =>
  p.then(
    matchResult<
      T,
      ApiError,
      Result<HttpResponse, HttpError>
    >(
      (e: ApiError) =>
        err(internalError(errMessage(e))),
      (v: T) => ok(jsonResponse(v)),
    ),
  );

const collectionsRoute =
  (db: Db): Handler =>
  (): PromisedResult<HttpResponse, HttpError> =>
    respond(listCollections(db));

/** Read the recognized list-query params into a bag. */
const readParams = (c: Context): QueryParams =>
  [
    "limit",
    "offset",
    "orderBy",
    "order",
    "q",
  ].reduce<QueryParams>(
    (acc, k: string) =>
      matchOption<SoftStr, QueryParams>(
        () => acc,
        (v: SoftStr) => ({ ...acc, [k]: v }),
      )(query(k)(c)),
    {},
  );

const listRoute =
  (db: Db): Handler =>
  (
    c: Context,
  ): PromisedResult<HttpResponse, HttpError> =>
    matchOption<
      SoftStr,
      PromisedResult<HttpResponse, HttpError>
    >(
      () =>
        Promise.resolve(
          err(badRequest("collection required")),
        ),
      (name: SoftStr) => {
        const q = asListQuery(readParams(c));
        return isErr(q)
          ? Promise.resolve(
              err(
                badRequest(
                  errMessage(q.content),
                ),
              ),
            )
          : respond(
              listCollection(db)(name, q.content),
            );
      },
    )(param("name")(c));

const documentRoute =
  (db: Db): Handler =>
  (
    c: Context,
  ): PromisedResult<HttpResponse, HttpError> =>
    matchOption<
      SoftStr,
      PromisedResult<HttpResponse, HttpError>
    >(
      () =>
        Promise.resolve(
          err(
            badRequest(
              "collection and path required",
            ),
          ),
        ),
      (collection: SoftStr) =>
        matchOption<
          SoftStr,
          PromisedResult<HttpResponse, HttpError>
        >(
          () =>
            Promise.resolve(
              err(
                badRequest(
                  "collection and path required",
                ),
              ),
            ),
          (path: SoftStr) =>
            getDocument(db)(
              collection,
              path,
            ).then(
              matchResult<
                Option<Document>,
                ApiError,
                Result<HttpResponse, HttpError>
              >(
                (e: ApiError) =>
                  err(
                    internalError(
                      errMessage(e),
                    ),
                  ),
                matchOption<
                  Document,
                  Result<HttpResponse, HttpError>
                >(
                  () =>
                    err(
                      notFound(
                        "document not found",
                      ),
                    ),
                  (d: Document) =>
                    ok(jsonResponse(d)),
                ),
              ),
            ),
        )(query("path")(c)),
    )(query("collection")(c));

const searchRoute =
  (
    db: Db,
    embedder: Option<Embedder>,
  ): Handler =>
  (
    c: Context,
  ): PromisedResult<HttpResponse, HttpError> =>
    respond(
      ragSearch(db, embedder)(
        matchOption<SoftStr, SoftStr>(
          () => "",
          (v: SoftStr) => v,
        )(query("q")(c)),
        matchOption<SoftStr, number>(
          () => 10,
          (v: SoftStr) => {
            const n = Number(v);
            return Number.isInteger(n) &&
              n > 0 &&
              n <= 50
              ? n
              : 10;
          },
        )(query("limit")(c)),
      ),
    );
