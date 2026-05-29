import {
  SoftStr,
  pipe,
  fromNullable,
  matchOption,
  chainOption,
} from "plgg";
import { VNode } from "plgg-view";
// `on` is plgg-router's data-last route builder (alias of its `get`).
import {
  Router,
  Location,
  router,
  on,
  param,
} from "plgg-router";
import { Todo } from "./models/Todo";
import {
  App,
  TodoDetail,
  TodoNotFound,
} from "./view";

/**
 * The not-found view — rendered for a `/todos/:id` whose id matches no todo and
 * supplied to `start` as the `notFound` fallback for any unmatched path.
 */
export const notFoundView: VNode = TodoNotFound();

/**
 * Builds the client route table for the To-Do SPA.
 *
 * Handlers read the live todo list through `getTodos` (a getter, **not** a
 * snapshot) so a single `start(router, ...)` keeps resolving against the latest
 * data after each async load/mutation — the router is built once, the data
 * flows under it. This is the canonical reconciliation of plgg-router's pure,
 * synchronous `Handler = (loc) => VNode` with asynchronously-fetched data.
 *
 * Each handler sets `document.title` — the host's responsibility per
 * plgg-router v1 (a `VNode` can't express `<title>`). This table is CSR-only,
 * so `document` is always present.
 */
export const buildClientRouter = (
  getTodos: () => ReadonlyArray<Todo>,
): Router =>
  pipe(
    router(),
    on("/", (): VNode => {
      document.title = "plgg To-Do";
      return App({ todos: getTodos() });
    }),
    on("/todos/:id", (loc: Location): VNode => {
      const found = pipe(
        loc,
        param("id"),
        chainOption((id: SoftStr) =>
          fromNullable(
            getTodos().find((todo) => todo.id === id),
          ),
        ),
      );
      document.title = pipe(
        found,
        matchOption(
          (): SoftStr => "Not found — plgg To-Do",
          (todo: Todo): SoftStr =>
            `${todo.title} — plgg To-Do`,
        ),
      );
      return pipe(
        found,
        matchOption(
          (): VNode => TodoNotFound(),
          (todo: Todo): VNode => TodoDetail({ todo }),
        ),
      );
    }),
  );
