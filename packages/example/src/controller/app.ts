import { randomUUID } from "node:crypto";
import {
  Option,
  SoftStr,
  Result,
  Time,
  ok,
  err,
  none,
  some,
  pipe,
  proc,
  mapErr,
  chainResult,
  decodeJson,
  fromNullable,
  matchOption,
} from "plgg";
import {
  Web,
  web,
  get,
  post,
  patch,
  del,
  jsonResponse,
  pageResponse,
  javascriptResponse,
  Context,
  HttpResponse,
  HttpError,
  internalError,
  badRequest,
  notFound,
  getParam,
} from "plgg-server";
import {
  Db,
  SqlError,
  ExecResult,
  query,
  exec,
  decodeRows,
} from "plgg-sql";
import { App } from "../view/App";
import {
  TodoDetail,
  TodoNotFound,
} from "../view/TodoDetail";
import {
  Todo,
  NewTodo,
  TodoPatch,
  asTodo,
  asNewTodo,
  asTodoPatch,
} from "../models/Todo";
import {
  LIST_TODOS_SQL,
  compactRow,
  deleteTodoSql,
  getTodoByIdSql,
  insertTodoSql,
  updateTodoCompletionSql,
} from "../db/open";

/**
 * Carried through a `proc` chain when a SQL row is missing, so the route's
 * single `mapErr(toHttpError)` at the edge can fold it to a 404. Using a
 * named subclass (rather than a tag string) keeps the route handler bodies
 * free of `HttpError`/`Box` types — those only ever appear after the fold.
 */
class RowNotFoundError extends Error {
  readonly path: SoftStr;
  constructor(path: SoftStr) {
    super(`row not found: ${path}`);
    this.name = "RowNotFoundError";
    this.path = path;
  }
}

/**
 * The one place the app assigns status codes. SQL failures become 500s,
 * missing-row failures become 404s, anything else (validation, missing param,
 * blank title, malformed JSON) becomes a 400. Reads the structured
 * object-content `HttpError` vocabulary.
 */
const toHttpError = (error: Error): HttpError =>
  error instanceof SqlError
    ? internalError("database error")
    : error instanceof RowNotFoundError
      ? notFound(error.path)
      : badRequest(error.message);

const compactRows = (
  rows: ReadonlyArray<unknown>,
): Result<ReadonlyArray<unknown>, never> =>
  ok(rows.map(compactRow));

/**
 * Wire shape: `Todo`'s `completedAt: Option<Time>` is a plgg `Box` value that
 * does NOT round-trip through `JSON.stringify`. Omit the `completedAt` key
 * entirely when `None` (matching what `compactRow` does to the raw SQL row);
 * include the ISO string when `Some`. This is the only shape `asTodo` accepts
 * on the consumer side.
 */
type WireTodo = Readonly<{
  id: SoftStr;
  title: SoftStr;
  completed: boolean;
  createdAt: SoftStr;
  completedAt?: SoftStr;
}>;

const toWireTodo = (todo: Todo): WireTodo => {
  const base = {
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    createdAt: todo.createdAt.toISOString(),
  };
  return pipe(
    todo.completedAt,
    matchOption(
      (): WireTodo => base,
      (t: Time): WireTodo => ({
        ...base,
        completedAt: t.toISOString(),
      }),
    ),
  );
};

const requireParam = (
  c: Context,
  name: SoftStr,
): Result<SoftStr, Error> =>
  pipe(
    getParam(c.req, name),
    matchOption(
      (): Result<SoftStr, Error> =>
        err(
          new Error(
            `missing path parameter: ${name}`,
          ),
        ),
      (value: SoftStr): Result<SoftStr, Error> =>
        ok(value),
    ),
  );

const decodeBody =
  <A>(
    decoder: (v: unknown) => Result<A, Error>,
  ) =>
  (c: Context): Result<A, Error> =>
    pipe(
      decodeJson(c.req.body),
      chainResult(decoder),
    );

const fetchTodoById = (
  db: Db,
  id: SoftStr,
): Promise<Result<Todo, Error>> =>
  proc(
    getTodoByIdSql(id),
    query(db),
    compactRows,
    decodeRows(asTodo),
    (todos: ReadonlyArray<Todo>) =>
      pipe(
        fromNullable(todos[0]),
        matchOption(
          (): Result<Todo, Error> =>
            err(
              new RowNotFoundError(
                `/api/todos/${id}`,
              ),
            ),
          (todo: Todo) => ok(todo),
        ),
      ),
  );

const insertAndReadBack = (
  db: Db,
  title: SoftStr,
): Promise<Result<HttpResponse, Error>> => {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  return proc(
    insertTodoSql(id, title, createdAt),
    exec(db),
    () => fetchTodoById(db, id),
    (todo: Todo) =>
      ok(jsonResponse(toWireTodo(todo), 201)),
  );
};

const updateAndReadBack = (
  db: Db,
  id: SoftStr,
  completed: boolean,
): Promise<Result<HttpResponse, Error>> => {
  const completedAt: Option<SoftStr> = completed
    ? some(new Date().toISOString())
    : none();
  return proc(
    updateTodoCompletionSql(id, completed, completedAt),
    exec(db),
    (result: ExecResult) =>
      result.changes === 0
        ? err(new RowNotFoundError(`/api/todos/${id}`))
        : ok(undefined),
    () => fetchTodoById(db, id),
    (todo: Todo) => ok(jsonResponse(toWireTodo(todo))),
  );
};

const deleteIfFound = (
  db: Db,
  id: SoftStr,
): Promise<Result<HttpResponse, Error>> =>
  proc(
    deleteTodoSql(id),
    exec(db),
    (result: ExecResult) =>
      result.changes === 0
        ? err(new RowNotFoundError(`/api/todos/${id}`))
        : ok(jsonResponse({ deleted: id })),
  );

/**
 * Builds the demo To-Do app: SSR HTML page, JSON CRUD API, and the CSR bundle.
 * Every handler is a `proc` chain (decode → SQL → respond) and folds failures
 * through the single `mapErr(toHttpError)` at the route edge. The same `asTodo`
 * caster decodes rows server-side, validates request bodies, and (in
 * `client.tsx`) decodes the JSON returned to the browser.
 */
export const buildApp = (
  db: Db,
  clientBundle: SoftStr,
): Web =>
  pipe(
    web(),
    // (1) SSR — initial page, list view rendered from the seeded rows.
    get("/", () =>
      proc(
        LIST_TODOS_SQL,
        query(db),
        compactRows,
        decodeRows(asTodo),
        (todos: ReadonlyArray<Todo>) =>
          ok(
            pageResponse({
              title: "plgg To-Do",
              root: App({ todos }),
              clientEntry: "/client.js",
            }),
          ),
      ).then(mapErr(toHttpError)),
    ),
    // (2) CSR bundle.
    get("/client.js", async () =>
      ok(javascriptResponse(clientBundle)),
    ),
    // (2b) SSR deep-link for a single todo. Serves the SPA shell with the
    // detail view so a hard refresh / shared `/todos/:id` link is valid HTML
    // (the client router re-renders the same view on hydrate). A missing id
    // renders the not-found view in-shell at 200, not a hard 404, so the SPA
    // stays navigable. This is one ordinary plgg-server route that happens to
    // render the same plgg-view component the client route does — NOT an
    // SSR↔plgg-router handoff (the two routers stay independent).
    get("/todos/:id", (c) =>
      proc(
        requireParam(c, "id"),
        (id: SoftStr) =>
          proc(
            getTodoByIdSql(id),
            query(db),
            compactRows,
            decodeRows(asTodo),
            (
              todos: ReadonlyArray<Todo>,
            ): Result<HttpResponse, Error> =>
              ok(
                pipe(
                  fromNullable(todos[0]),
                  matchOption(
                    (): HttpResponse =>
                      pageResponse({
                        title: "Not found — plgg To-Do",
                        root: TodoNotFound(),
                        clientEntry: "/client.js",
                      }),
                    (todo: Todo): HttpResponse =>
                      pageResponse({
                        title: `${todo.title} — plgg To-Do`,
                        root: TodoDetail({ todo }),
                        clientEntry: "/client.js",
                      }),
                  ),
                ),
              ),
          ),
      ).then(mapErr(toHttpError)),
    ),
    // (3) JSON list — consumed by `client.tsx` after each mutation.
    get("/api/todos", () =>
      proc(
        LIST_TODOS_SQL,
        query(db),
        compactRows,
        decodeRows(asTodo),
        (todos: ReadonlyArray<Todo>) =>
          ok(jsonResponse(todos.map(toWireTodo))),
      ).then(mapErr(toHttpError)),
    ),
    // (4) Create.
    post("/api/todos", (c) =>
      proc(
        ok(c),
        decodeBody(asNewTodo),
        (newTodo: NewTodo) =>
          insertAndReadBack(db, newTodo.title),
      ).then(mapErr(toHttpError)),
    ),
    // (5) Toggle completion.
    patch("/api/todos/:id", (c) =>
      proc(
        requireParam(c, "id"),
        (id: SoftStr) =>
          proc(
            ok(c),
            decodeBody(asTodoPatch),
            (body: TodoPatch) =>
              updateAndReadBack(
                db,
                id,
                body.completed,
              ),
          ),
      ).then(mapErr(toHttpError)),
    ),
    // (6) Delete.
    del("/api/todos/:id", (c) =>
      proc(
        requireParam(c, "id"),
        (id: SoftStr) => deleteIfFound(db, id),
      ).then(mapErr(toHttpError)),
    ),
  );
