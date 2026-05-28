import {
  InvalidError,
  SoftStr,
  pipe,
  fromNullable,
  mapOption,
  match,
  matchResult,
  encodeJson,
} from "plgg";
import { render } from "plgg-server/client";
import {
  HttpResponse,
  notFound$,
  methodNotAllowed$,
  badRequest$,
  unsupported$,
  unauthorized$,
  forbidden$,
  statusError$,
  internalError$,
} from "plgg-server";
import {
  get,
  post,
  patch,
  del,
  decodeJsonBody,
  ClientError,
  networkError$,
} from "plgg-fetch";
import { App } from "./view/App";
import { asTodos } from "./models/Todo";

/**
 * The CSR side of the To-Do app. plgg-fetch is the HTTP client end-to-end (no
 * native `fetch` here): `get`/`post`/`patch`/`del` return
 * `PromisedResult<HttpResponse, ClientError>`, decoded with
 * `decodeJsonBody(asTodo[s])` at every boundary. The same `ClientError`
 * vocabulary that the server folds as `HttpError` is folded here on the
 * client — the typed-client surface is symmetric end-to-end.
 *
 * Event handling is delegated on the `#root` element so a re-render that
 * replaces the DOM doesn't lose any listeners.
 */

const BASE: SoftStr = "";

/**
 * Folds the `ClientError` ADT (network + the full `HttpError` vocabulary) by
 * named pattern — same shape as `plgg-fetch/example.ts`.
 */
const describeClientError = (
  error: ClientError,
): SoftStr =>
  match(error)(
    [
      networkError$(),
      (e) => `network error — ${e.content.message}`,
    ],
    [
      notFound$(),
      (e) => `not found — ${e.content.path}`,
    ],
    [
      methodNotAllowed$(),
      (e) =>
        `method not allowed; allowed: ${e.content.allowed.join(", ")}`,
    ],
    [
      badRequest$(),
      (e) => `bad request — ${e.content.message}`,
    ],
    [
      unsupported$(),
      (e) => `unsupported — ${e.content.message}`,
    ],
    [
      unauthorized$(),
      (e) => `unauthorized — ${e.content.message}`,
    ],
    [
      forbidden$(),
      (e) => `forbidden — ${e.content.message}`,
    ],
    [
      statusError$(),
      (e) =>
        `${e.content.status.content} — ${e.content.message}`,
    ],
    [
      internalError$(),
      (e) =>
        `internal error — ${e.content.message}`,
    ],
  );

const reportClient =
  (action: SoftStr) =>
  (error: ClientError): void =>
    console.error(
      `${action}: ${describeClientError(error)}`,
    );

const reportDecode =
  (action: SoftStr) =>
  (error: InvalidError): void =>
    console.error(
      `${action}: decode error — ${error.message}`,
    );

/**
 * Re-fetch the typed-Todo list (`decodeJsonBody(asTodos)` — same caster the
 * server used to decode rows) and re-render `App` into `root`. Called once on
 * hydrate (to prove SSR ↔ CSR isomorphism) and after every successful mutation.
 */
const refresh = (root: Element): Promise<void> =>
  get(`${BASE}/api/todos`).then(
    matchResult(
      reportClient("refresh"),
      (response: HttpResponse) =>
        pipe(
          response,
          decodeJsonBody(asTodos),
          matchResult(
            reportDecode("refresh"),
            (todos) => {
              render(App({ todos }), root);
            },
          ),
        ),
    ),
  );

const createTodo = (
  title: SoftStr,
  root: Element,
): Promise<void> =>
  pipe(
    encodeJson({ title }),
    matchResult(
      (error: InvalidError) =>
        Promise.resolve(
          reportDecode("create")(error),
        ),
      (body: SoftStr) =>
        post(`${BASE}/api/todos`, {
          headers: {
            "content-type": "application/json",
          },
          body,
        }).then(
          matchResult(
            (error) =>
              Promise.resolve(
                reportClient("create")(error),
              ),
            () => refresh(root),
          ),
        ),
    ),
  );

const toggleTodo = (
  id: SoftStr,
  completed: boolean,
  root: Element,
): Promise<void> =>
  pipe(
    encodeJson({ completed }),
    matchResult(
      (error: InvalidError) =>
        Promise.resolve(
          reportDecode("toggle")(error),
        ),
      (body: SoftStr) =>
        patch(`${BASE}/api/todos/${id}`, {
          headers: {
            "content-type": "application/json",
          },
          body,
        }).then(
          matchResult(
            (error) =>
              Promise.resolve(
                reportClient("toggle")(error),
              ),
            () => refresh(root),
          ),
        ),
    ),
  );

const deleteTodo = (
  id: SoftStr,
  root: Element,
): Promise<void> =>
  del(`${BASE}/api/todos/${id}`).then(
    matchResult(
      (error) =>
        Promise.resolve(
          reportClient("delete")(error),
        ),
      () => refresh(root),
    ),
  );

/**
 * Attach delegated listeners to `root` so dynamic re-renders don't lose them.
 * `submit` handles the add-form; `change` on a `data-action="toggle"` checkbox
 * is the toggle; `click` on a `data-action="delete"` button is the delete.
 */
const wire = (root: Element): void => {
  root.addEventListener("submit", (event) => {
    if (!(event.target instanceof HTMLFormElement))
      return;
    const form = event.target;
    if (form.dataset["action"] !== "create") return;
    event.preventDefault();
    const input = form.elements.namedItem("title");
    if (!(input instanceof HTMLInputElement)) return;
    const title = input.value.trim();
    if (title.length === 0) return;
    createTodo(title, root).then(() => {
      input.value = "";
    });
  });

  root.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement))
      return;
    const input = event.target;
    if (input.dataset["action"] !== "toggle") return;
    const id = input.dataset["todoId"];
    if (id === undefined) return;
    toggleTodo(id, input.checked, root);
  });

  root.addEventListener("click", (event) => {
    if (
      !(event.target instanceof HTMLButtonElement)
    )
      return;
    const button = event.target;
    if (button.dataset["action"] !== "delete") return;
    const id = button.dataset["todoId"];
    if (id === undefined) return;
    deleteTodo(id, root);
  });
};

pipe(
  fromNullable(document.getElementById("root")),
  mapOption((root: HTMLElement): void => {
    wire(root);
    void refresh(root);
  }),
);
