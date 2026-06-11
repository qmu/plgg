import {
  SoftStr,
  fromNullable,
  some,
} from "plgg";
import {
  Application,
  makeUrl,
} from "plgg-view/client";
import {
  Html,
  div,
  header,
  h1,
  h2,
  p,
  form,
  input,
  button,
  ul,
  li,
  span,
  text,
  attr,
  class_,
  type_,
  value_,
  name_,
  onInput,
  onSubmit,
  onClick,
  onChange,
  key,
  fadeIn,
  fadeOut,
  transition,
} from "plgg-view";
import {
  QueryCodec,
  parseQuery,
  serializeQuery,
  queryEnum,
  queryStr,
  writeField,
} from "plgg-router";
// Namespaced so the Tailwind-style names (`p`, `text`, …) coexist with the Html
// element builders of the same name imported above.
import * as sx from "plgg-view/style";
import { Todo } from "./Todo";

/** Which todos the list shows — reflected to the URL as `?filter=…`. */
export type Filter =
  | "all"
  | "active"
  | "completed";

/**
 * A transient notification in the toaster stack — pure data, like everything
 * else. `id` is a monotonic key (separate from todo ids) so the keyed renderer
 * tracks each toast across renders; dismissing one fades + collapses *it* and
 * FLIPs the rest of the stack up to close the gap.
 */
export type Toast = Readonly<{
  id: number;
  tone: "success" | "info" | "danger";
  message: SoftStr;
}>;

/**
 * The whole app state as one immutable value: the todo list, the add-form draft,
 * the next id to assign, the URL-reflected view state (`filter` + the search
 * `q`), and the UI-interaction state the four micro-interactions need — the
 * toaster stack, which todos are expanded (accordion), and whether the
 * clear-completed confirmation modal is open. Keeping all of it in the Model is
 * what lets the runtime *project* `filter`/`q` into the address bar (nuqs-style)
 * with no imperative URL setter, and animate add/remove/move purely from data.
 */
export type Model = Readonly<{
  todos: ReadonlyArray<Todo>;
  draft: SoftStr;
  nextId: number;
  filter: Filter;
  q: SoftStr;
  /** The toaster stack (newest last); rendered as a keyed list. */
  toasts: ReadonlyArray<Toast>;
  /** Monotonic id for the next toast. */
  toastSeq: number;
  /** Todo ids whose accordion details panel is open. */
  expanded: ReadonlyArray<number>;
  /** Whether the clear-completed confirmation modal is open. */
  confirmClear: boolean;
}>;

/** Everything that can happen, as data. */
export type Msg =
  | Readonly<{
      kind: "DraftChanged";
      value: SoftStr;
    }>
  | Readonly<{ kind: "Added" }>
  | Readonly<{ kind: "Toggled"; id: number }>
  | Readonly<{ kind: "Deleted"; id: number }>
  | Readonly<{
      kind: "FilterChanged";
      filter: Filter;
    }>
  | Readonly<{
      kind: "SearchChanged";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "UrlChanged";
      filter: Filter;
      q: SoftStr;
    }>
  // accordion: toggle a todo's details panel open/closed
  | Readonly<{
      kind: "ExpandToggled";
      id: number;
    }>
  // toaster: a toast dismissed by its close button
  | Readonly<{
      kind: "ToastDismissed";
      id: number;
    }>
  // modal: open / cancel / confirm the clear-completed dialog
  | Readonly<{ kind: "ClearRequested" }>
  | Readonly<{ kind: "ClearCancelled" }>
  | Readonly<{ kind: "ClearConfirmed" }>;

export const init: Model = {
  todos: [],
  draft: "",
  nextId: 1,
  filter: "all",
  q: "",
  toasts: [],
  toastSeq: 1,
  expanded: [],
  confirmClear: false,
};

/** Append a toast, minting its id from `toastSeq`. Pure. */
const pushToast = (
  model: Model,
  tone: Toast["tone"],
  message: SoftStr,
): Model => ({
  ...model,
  toasts: [
    ...model.toasts,
    { id: model.toastSeq, tone, message },
  ],
  toastSeq: model.toastSeq + 1,
});

/**
 * Pure state transition: a `Msg` and the old `Model` in, the new `Model` out.
 * No DOM, no effects — trivially unit-testable. A discriminated `switch` (one
 * arm per `Msg`, each returning) keeps it exhaustive: TS narrows `msg` to
 * `never` after the last arm, so a new `Msg` that isn't handled is a compile
 * error — no silent default. The URL-reflected `filter`/`q` fold in here too,
 * including the `UrlChanged` message the runtime sends on navigation.
 */
export const update = (
  msg: Msg,
  model: Model,
): Model => {
  switch (msg.kind) {
    case "FilterChanged":
      return { ...model, filter: msg.filter };
    case "SearchChanged":
      return { ...model, q: msg.value };
    case "UrlChanged":
      return {
        ...model,
        filter: msg.filter,
        q: msg.q,
      };
    case "DraftChanged":
      return { ...model, draft: msg.value };
    case "Added": {
      const title = model.draft.trim();
      return title.length === 0
        ? model
        : pushToast(
            {
              ...model,
              todos: [
                ...model.todos,
                {
                  id: model.nextId,
                  title,
                  completed: false,
                },
              ],
              draft: "",
              nextId: model.nextId + 1,
            },
            "success",
            `Added “${title}”`,
          );
    }
    case "Toggled":
      return {
        ...model,
        todos: model.todos.map((todo) =>
          todo.id === msg.id
            ? {
                ...todo,
                completed: !todo.completed,
              }
            : todo,
        ),
      };
    case "Deleted": {
      const gone = model.todos.find(
        (todo) => todo.id === msg.id,
      );
      return pushToast(
        {
          ...model,
          todos: model.todos.filter(
            (todo) => todo.id !== msg.id,
          ),
          expanded: model.expanded.filter(
            (id) => id !== msg.id,
          ),
        },
        "danger",
        gone
          ? `Deleted “${gone.title}”`
          : "Deleted",
      );
    }
    case "ExpandToggled":
      return {
        ...model,
        expanded: model.expanded.includes(msg.id)
          ? model.expanded.filter(
              (id) => id !== msg.id,
            )
          : [...model.expanded, msg.id],
      };
    case "ToastDismissed":
      return {
        ...model,
        toasts: model.toasts.filter(
          (toast) => toast.id !== msg.id,
        ),
      };
    case "ClearRequested":
      return { ...model, confirmClear: true };
    case "ClearCancelled":
      return { ...model, confirmClear: false };
    case "ClearConfirmed": {
      const cleared = model.todos.filter(
        (todo) => todo.completed,
      ).length;
      return pushToast(
        {
          ...model,
          todos: model.todos.filter(
            (todo) => !todo.completed,
          ),
          confirmClear: false,
        },
        "info",
        `Cleared ${cleared} completed`,
      );
    }
  }
};

/** Whether a todo passes the active filter. */
const matchesFilter = (
  filter: Filter,
  todo: Todo,
): boolean =>
  filter === "all"
    ? true
    : filter === "active"
      ? !todo.completed
      : todo.completed;

/** The todos the current `filter` + search `q` keep visible. */
const visibleTodos = (
  model: Model,
): ReadonlyArray<Todo> =>
  model.todos.filter(
    (todo) =>
      matchesFilter(model.filter, todo) &&
      todo.title
        .toLowerCase()
        .includes(model.q.toLowerCase()),
  );

const FILTERS: ReadonlyArray<Filter> = [
  "all",
  "active",
  "completed",
];

// Reusable styles composed once. `style_` is the one styling primitive: a hook
// string + atoms + variants (`:hover`/`:focus`) → atomic classes the fold emits
// into <head>. (For a dynamic inline value, `attr("style", …)` is the escape.)
const inputStyle = sx.style_(
  sx.grow,
  sx.px(3),
  sx.py(2),
  sx.rounded("md"),
  sx.border,
  sx.text("base"),
  sx.focus(sx.outline("primary")),
);

const primaryButtonStyle = sx.style_(
  sx.px(4),
  sx.py(2),
  sx.rounded("md"),
  sx.bg("primary"),
  sx.color("primary-text"),
  sx.weight(600),
  sx.pointer,
  sx.hover(sx.shadow("md")),
  sx.focus(sx.outline("primary")),
);

// ── Toaster ──────────────────────────────────────────────────────────────────
// A toast slides in from the right edge and slides back out as it leaves. Built
// straight from the `transition` primitive (opacity + transform frames) rather
// than the vertical `slideIn` helper, to exercise a horizontal motion. On
// dismiss the keyed renderer also collapses the toast's height so the stack
// closes the gap.
const toastMotion = transition({
  enter: {
    from: {
      opacity: some(0),
      transform: some("translateX(110%)"),
    },
    to: {
      opacity: some(1),
      transform: some("translateX(0)"),
    },
    durationMs: 220,
    easing: "ease-out",
  },
  exit: {
    from: {
      opacity: some(1),
      transform: some("translateX(0)"),
    },
    to: {
      opacity: some(0),
      transform: some("translateX(110%)"),
    },
    durationMs: 200,
    easing: "ease-in",
  },
});

/** One toast row — keyed by id so the stack reconciles by identity. */
const viewToast = (
  toast: Toast,
): Html<Msg, "div"> =>
  div(
    [
      key(`toast-${toast.id}`),
      sx.style_(
        "toast",
        sx.flex,
        sx.items("center"),
        sx.gap(3),
        sx.px(4),
        sx.py(3),
        sx.rounded("md"),
        sx.shadow("md"),
        ...(toast.tone === "danger"
          ? [
              sx.bg("danger"),
              sx.color("primary-text"),
            ]
          : toast.tone === "success"
            ? [
                sx.bg("primary"),
                sx.color("primary-text"),
              ]
            : [
                sx.bg("surface"),
                sx.color("text"),
                sx.border,
              ]),
      ),
      toastMotion,
    ],
    [
      span(
        [
          sx.style_(
            sx.grow,
            sx.text("sm"),
            sx.weight(600),
          ),
        ],
        [text(toast.message)],
      ),
      button(
        [
          class_("toast-dismiss"),
          attr(
            "style",
            "background:transparent;border:none;cursor:pointer;font-size:1rem;line-height:1;color:inherit;opacity:0.8",
          ),
          onClick<Msg>({
            kind: "ToastDismissed",
            id: toast.id,
          }),
        ],
        [text("✕")],
      ),
    ],
  );

/**
 * The toaster — a fixed, top-right stack. Always rendered (even empty) so it is
 * a stable keyed child of the root; its *toasts* are the keyed list that
 * animates. Position/stacking go through the `attr("style", …)` escape hatch:
 * the style system has no `position`/`z-index`/`inset` utilities yet (a gap
 * these components surface).
 */
const viewToaster = (
  model: Model,
): Html<Msg, "div"> =>
  div(
    [
      key("toaster"),
      class_("toaster"),
      attr(
        "style",
        "position:fixed;top:1rem;right:1rem;z-index:60;display:flex;flex-direction:column;gap:0.5rem;width:18rem;max-width:calc(100vw - 2rem)",
      ),
    ],
    model.toasts.map(viewToast),
  );

/**
 * The clear-completed confirmation modal: a backdrop (fixed, fades, click to
 * cancel) and a separately-positioned centered dialog (so a click inside the
 * dialog never bubbles to the backdrop's cancel handler — there is no
 * stopPropagation in the Msg model). Both are conditionally present and keyed,
 * so opening/closing plays their enter/exit through the renderer's lifecycle.
 * The dialog animates opacity only (its centering `translate(-50%,-50%)` is a
 * static transform a WAAPI transform tween would fight).
 */
const viewModal = (
  model: Model,
): ReadonlyArray<Html<Msg, "div">> =>
  model.confirmClear
    ? [
        div(
          [
            key("modal-backdrop"),
            class_("modal-backdrop"),
            attr(
              "style",
              "position:fixed;inset:0;z-index:40;background:rgba(15,23,42,0.45)",
            ),
            fadeIn(160),
            fadeOut(160),
            onClick<Msg>({
              kind: "ClearCancelled",
            }),
          ],
          [],
        ),
        div(
          [
            key("modal-dialog"),
            attr(
              "style",
              "position:fixed;z-index:50;top:50%;left:50%;transform:translate(-50%,-50%);width:22rem;max-width:calc(100vw - 2rem)",
            ),
            sx.style_(
              "modal",
              sx.bg("surface"),
              sx.color("text"),
              sx.p(5),
              sx.rounded("md"),
              sx.shadow("md"),
              sx.flexCol,
              sx.gap(3),
            ),
            fadeIn(160),
            fadeOut(160),
          ],
          [
            h2(
              [
                sx.style_(
                  sx.text("xl"),
                  sx.weight(700),
                ),
              ],
              [text("Clear completed?")],
            ),
            p(
              [
                sx.style_(
                  sx.color("muted"),
                  sx.text("sm"),
                ),
              ],
              [
                text(
                  "This removes every completed task. You can’t undo it.",
                ),
              ],
            ),
            div(
              [
                sx.style_(
                  sx.flex,
                  sx.justify("end"),
                  sx.gap(2),
                  sx.mt(2),
                ),
              ],
              [
                button(
                  [
                    sx.style_(
                      "modal-cancel",
                      sx.px(4),
                      sx.py(2),
                      sx.rounded("md"),
                      sx.border,
                      sx.bg("surface"),
                      sx.color("text"),
                      sx.pointer,
                      sx.hover(sx.shadow("sm")),
                    ),
                    onClick<Msg>({
                      kind: "ClearCancelled",
                    }),
                  ],
                  [text("Cancel")],
                ),
                button(
                  [
                    sx.style_(
                      "modal-confirm",
                      sx.px(4),
                      sx.py(2),
                      sx.rounded("md"),
                      sx.bg("danger"),
                      sx.color("primary-text"),
                      sx.weight(600),
                      sx.pointer,
                      sx.hover(sx.shadow("md")),
                    ),
                    onClick<Msg>({
                      kind: "ClearConfirmed",
                    }),
                  ],
                  [text("Clear completed")],
                ),
              ],
            ),
          ],
        ),
      ]
    : [];

// Returns `Html<Msg, "div">` (not the bare `Html<Msg>`) so it drops into the
// flow-content toolbar below — a bare `Html<Msg>` would be a compile error.
const viewFilters = (
  model: Model,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "todo-filters",
        sx.flex,
        sx.gap(2),
      ),
    ],
    FILTERS.map((filter) =>
      button(
        [
          // one styling primitive: the hook string keeps the `.filter`/`.selected`
          // test selectors; atoms + a :hover lift + a :focus ring extract to <head>.
          sx.style_(
            model.filter === filter
              ? "filter selected"
              : "filter",
            sx.px(3),
            sx.py(1),
            sx.rounded("md"),
            sx.border,
            sx.pointer,
            sx.text("sm"),
            sx.hover(sx.shadow("sm")),
            sx.focus(sx.outline("primary")),
            ...(model.filter === filter
              ? [
                  sx.bg("primary"),
                  sx.color("primary-text"),
                ]
              : [
                  sx.bg("surface"),
                  sx.color("text"),
                ]),
          ),
          onClick<Msg>({
            kind: "FilterChanged",
            filter,
          }),
        ],
        [text(filter)],
      ),
    ),
  );

// The return type is the narrowed `Html<Msg, "li">`, not the bare `Html<Msg>`:
// that is what lets `viewTodo` drop into `ul`'s `li`-only children slot below.
// `isOpen` drives the accordion: the details panel is a conditional *trailing*
// child of the row, so adding/removing it plays the index-path enter/exit
// (slide-in on expand, fade-out on collapse).
const viewTodo = (
  todo: Todo,
  isOpen: boolean,
): Html<Msg, "li"> =>
  li(
    [
      // stable identity → keyed reconcile: deleting / filtering a middle item
      // fades *that* row and FLIPs the rest up to close the gap, instead of the
      // index path rewriting slots in place (which faded the wrong, last row).
      key(`${todo.id}`),
      sx.style_(
        todo.completed ? "todo done" : "todo",
        // a column now: the checkbox/title/delete row on top, the accordion
        // details panel below it
        sx.flexCol,
        sx.p(3),
        // row spacing as margin (not list gap) so the exit collapse can shrink
        // it to 0 — a flex gap can't be animated per-item and would leave a jump.
        sx.mb(2),
        sx.rounded("md"),
        sx.border,
        sx.bg("surface"),
      ),
      // a new item fades in; a removed / filtered-out one fades out before the
      // renderer detaches it (the deferred-removal exit lifecycle)
      fadeIn(150),
      fadeOut(150),
    ],
    [
      div(
        [
          sx.style_(
            "todo-row",
            sx.flex,
            sx.items("center"),
            sx.gap(3),
          ),
        ],
        [
          input(
            [
              type_("checkbox"),
              ...(todo.completed
                ? [attr("checked", "")]
                : []),
              onChange<Msg>(() => ({
                kind: "Toggled",
                id: todo.id,
              })),
            ],
            [],
          ),
          // the title doubles as the accordion toggle — click to expand/collapse
          span(
            [
              sx.style_(
                "todo-title",
                sx.grow,
                sx.pointer,
                ...(todo.completed
                  ? [sx.color("muted")]
                  : []),
              ),
              onClick<Msg>({
                kind: "ExpandToggled",
                id: todo.id,
              }),
            ],
            [text(todo.title)],
          ),
          button(
            [
              sx.style_(
                "todo-delete",
                sx.px(3),
                sx.py(1),
                sx.rounded("md"),
                sx.bg("danger"),
                sx.color("primary-text"),
                sx.pointer,
                sx.text("sm"),
                sx.hover(sx.shadow("md")),
                sx.focus(sx.outline("danger")),
              ),
              onClick<Msg>({
                kind: "Deleted",
                id: todo.id,
              }),
            ],
            [text("delete")],
          ),
        ],
      ),
      // accordion body — always mounted; open/close animates BOTH directions via
      // a pure-CSS grid-rows transition (0fr⇄1fr) with an overflow-clipped inner
      // track (min-height:0 lets the track actually collapse). The renderer just
      // patches the style attribute between renders and the browser tweens the
      // height. (This uses `attr("style", …)` because the Motion model is
      // opacity+transform only and can't express height — the renderer-level
      // size lifecycle that would replace this is the gap the accordion surfaces.)
      div(
        [
          class_(
            isOpen
              ? "todo-details open"
              : "todo-details",
          ),
          attr(
            "style",
            `display:grid;grid-template-rows:${isOpen ? "1fr" : "0fr"};transition:grid-template-rows 220ms ease`,
          ),
        ],
        [
          div(
            [
              attr(
                "style",
                "overflow:hidden;min-height:0",
              ),
            ],
            [
              div(
                [
                  sx.style_(
                    sx.pt(3),
                    sx.text("sm"),
                    sx.color("muted"),
                  ),
                ],
                [
                  text(
                    `#${todo.id} · ${todo.completed ? "completed" : "active"} · click the title again to collapse`,
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );

/**
 * Pure render: the screen for a given `Model`. Event handlers live in the tree
 * and produce `Msg`s the runtime feeds back into `update`. The filter buttons
 * and the search box change `filter`/`q`, which the runtime reflects into the
 * URL — no `setQueryState` call anywhere.
 */
export const view = (model: Model): Html<Msg> =>
  div(
    // full-width page wrapper that centers the card
    [
      sx.style_(
        sx.flex,
        sx.justify("center"),
        sx.p(4),
        sx.color("text"),
      ),
    ],
    [
      div(
        [
          // keyed so the root's children (card + modal + toaster) reconcile by
          // identity — the modal can appear/leave with motion beside a stable card
          key("app"),
          sx.style_(
            "todos",
            sx.wFull,
            sx.maxW(160),
            sx.flexCol,
            sx.gap(4),
          ),
        ],
        [
          header(
            [class_("todos-header")],
            [
              h1(
                [
                  sx.style_(
                    sx.text("2xl"),
                    sx.weight(700),
                    sx.mb(1),
                  ),
                ],
                [
                  text(
                    "plgg To-Do — Elm Architecture",
                  ),
                ],
              ),
              p(
                [
                  sx.style_(
                    sx.color("muted"),
                    sx.text("sm"),
                  ),
                ],
                [
                  text(
                    "One pure Model/update/view, rendered on the server (SSR) and taken over by the client (CSR) on plgg-view's minimal Elm Architecture. The filter and search are reflected to the URL.",
                  ),
                ],
              ),
            ],
          ),
          form(
            [
              sx.style_(
                "todo-form",
                sx.flex,
                sx.gap(2),
              ),
              onSubmit<Msg>({ kind: "Added" }),
            ],
            [
              input(
                [
                  type_("text"),
                  name_("title"),
                  value_(model.draft),
                  inputStyle,
                  onInput<Msg>((value) => ({
                    kind: "DraftChanged",
                    value,
                  })),
                ],
                [],
              ),
              button(
                [
                  type_("submit"),
                  primaryButtonStyle,
                ],
                [text("Add")],
              ),
            ],
          ),
          div(
            [
              sx.style_(
                "todo-toolbar",
                sx.flex,
                // wrap so the filter group + search reflow to two lines on a
                // narrow (phone) viewport instead of crowding one row
                sx.wrap,
                sx.items("center"),
                sx.gap(2),
              ),
            ],
            [
              viewFilters(model),
              input(
                [
                  type_("search"),
                  name_("q"),
                  value_(model.q),
                  inputStyle,
                  onInput<Msg>((value) => ({
                    kind: "SearchChanged",
                    value,
                  })),
                ],
                [],
              ),
              // opens the clear-completed confirmation modal
              button(
                [
                  sx.style_(
                    "clear-completed",
                    sx.px(3),
                    sx.py(1),
                    sx.rounded("md"),
                    sx.border,
                    sx.bg("surface"),
                    sx.color("text"),
                    sx.pointer,
                    sx.text("sm"),
                    sx.hover(sx.shadow("sm")),
                    sx.focus(sx.outline("danger")),
                  ),
                  onClick<Msg>({
                    kind: "ClearRequested",
                  }),
                ],
                [text("Clear completed")],
              ),
            ],
          ),
          ul(
            [
              sx.style_(
                "todo-list",
                sx.flexCol,
                sx.listNone,
                sx.p(0),
                sx.m(0),
              ),
            ],
            visibleTodos(model).map((todo) =>
              viewTodo(
                todo,
                model.expanded.includes(todo.id),
              ),
            ),
          ),
        ],
      ),
      // root-level overlays — both keyed, so they enter/leave with motion
      // alongside the stable card above
      ...viewModal(model),
      viewToaster(model),
    ],
  );

/**
 * The URL-reflected slice of the Model, as a bidirectional query codec composed
 * from plgg-router's typed field codecs (explicit object literals — the no-cast
 * house rule rules out a generic record composer). `filter`/`q` at their
 * defaults are omitted from the query, so a pristine view has a clean `/` URL.
 */
type Query = Readonly<{
  filter: Filter;
  q: SoftStr;
}>;

const filterField = queryEnum(
  ["all", "active", "completed"],
  "all",
);
const searchField = queryStr("");

const queryCodec: QueryCodec<Query> = {
  decode: (query) => ({
    filter: filterField.decode(
      fromNullable(query["filter"]),
    ),
    q: searchField.decode(
      fromNullable(query["q"]),
    ),
  }),
  encode: (value) => ({
    ...writeField(
      "filter",
      filterField.encode(value.filter),
    ),
    ...writeField(
      "q",
      searchField.encode(value.q),
    ),
  }),
};

/**
 * The Elm-Architecture program. Now an `Application` (not a `sandbox`) so the
 * runtime owns the URL too: `init` seeds `filter`/`q` from the entry query,
 * `onUrlChange` folds a navigation back in, and `toUrl` *projects* the current
 * `filter`/`q` into the address bar after every update — a filter change pushes
 * a history entry (so back/forward traverses it), a keystroke in search only
 * replaces (no history spam). The server renders the same `view(init)` (see
 * `server.ts`); `main.ts` mounts this with `application(app)(root)`.
 */
export const app: Application<Model, Msg> = {
  init: (url) => ({
    ...init,
    ...queryCodec.decode(parseQuery(url.search)),
  }),
  update,
  view,
  onUrlChange: (url) => {
    const { filter, q } = queryCodec.decode(
      parseQuery(url.search),
    );
    return { kind: "UrlChanged", filter, q };
  },
  toUrl: (model) =>
    makeUrl(
      "/",
      serializeQuery(
        queryCodec.encode({
          filter: model.filter,
          q: model.q,
        }),
      ),
    ),
  historyMode: (prev, next) =>
    prev.filter !== next.filter
      ? "push"
      : "replace",
};
