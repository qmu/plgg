import {
  type SoftStr,
  type Int,
  box,
  fromNullable,
  some,
} from "plgg";
import {
  type Application,
  makeUrl,
} from "plgg-view/client";
import {
  type Html,
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
  easeOut,
  easeIn,
} from "plgg-view";
import {
  type QueryCodec,
  parseQuery,
  serializeQuery,
  queryEnum,
  queryStr,
  writeField,
} from "plgg-router";
// Namespaced so the Tailwind-style names (`p`, `text`, …) coexist with the Html
// element builders of the same name imported above.
import * as sx from "plgg-view/style";
import type { Todo } from "./Todo.ts";

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
  id: Int;
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
  nextId: Int;
  filter: Filter;
  q: SoftStr;
  /** The toaster stack (newest last); rendered as a keyed list. */
  toasts: ReadonlyArray<Toast>;
  /** Monotonic id for the next toast. */
  toastSeq: Int;
  /** Todo ids whose accordion details panel is open. */
  expanded: ReadonlyArray<Int>;
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
  | Readonly<{ kind: "Toggled"; id: Int }>
  | Readonly<{ kind: "Deleted"; id: Int }>
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
      id: Int;
    }>
  // reorder: move a todo up (delta -1) or down (+1) — drives the FLIP path
  | Readonly<{
      kind: "Moved";
      id: Int;
      delta: Int;
    }>
  // toaster: a toast dismissed by its close button
  | Readonly<{
      kind: "ToastDismissed";
      id: Int;
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

/**
 * Move the todo `id` by `delta` positions (clamped), swapping it with its
 * neighbour. Pure and bounds-guarded — out-of-range returns the list unchanged.
 * The keyed list means this swap is what the renderer animates as a FLIP.
 */
const move = (
  todos: ReadonlyArray<Todo>,
  id: Int,
  delta: Int,
): ReadonlyArray<Todo> => {
  const i = todos.findIndex((t) => t.id === id);
  const j = i + delta;
  const a = todos[i];
  const b = todos[j];
  return a === undefined || b === undefined
    ? todos
    : todos.map((t, k) =>
        k === i ? b : k === j ? a : t,
      );
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
    case "Moved":
      return {
        ...model,
        todos: move(
          model.todos,
          msg.id,
          msg.delta,
        ),
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

// Flat, square, borderless chrome — an intentional editorial look, not the
// default bordered/rounded/shadowed buttons. Geometry goes through the
// `attr("style", …)` escape (the style system has no border-reset / underline
// utilities); `bg`/`hover`/`focus` stay in `sx` so hover can still swap the fill
// (an inline `background` would beat a `:hover` rule and break it).

// Underline text field: no box, just a hairline rule that the focus ring lifts.
const FIELD_GEO =
  "appearance:none;border:0;border-bottom:1.5px solid #d8ccb4;border-radius:0;background:transparent;color:#2a241d;font:inherit;padding:0.5rem 0.15rem";
const inputStyle = sx.style_(
  sx.grow,
  sx.text("base"),
  sx.focus(sx.outline("primary")),
);

// Solid accent block; the fill flips to ink on hover (sx variant, not inline).
const PRIMARY_BTN_GEO =
  "appearance:none;border:0;border-radius:0;color:#fbfaf3;font:inherit;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;font-size:0.78rem;padding:0.7rem 1.4rem;cursor:pointer";
const primaryButtonStyle = sx.style_(
  sx.bg("primary"),
  sx.hover(sx.bg("text")),
  sx.focus(sx.outline("primary")),
);

// Borderless text button (clear, delete) — flat, square, uppercase.
const GHOST_BTN_GEO =
  "appearance:none;border:0;border-radius:0;background:transparent;font:inherit;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;font-size:0.72rem;padding:0.5rem 0.7rem;cursor:pointer";

// Filter-pill geometry — no `background` so the sx fill (selected vs hover) wins.
const FILTER_GEO =
  "appearance:none;border:0;border-radius:0;font:inherit;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;font-size:0.72rem;padding:0.5rem 0.85rem;cursor:pointer";

// Tiny chevron reorder button. Inline because the style system has no
// transparent-background / borderless utility (another small gap these
// controls surface).
const REORDER_BTN_STYLE =
  "background:transparent;border:none;border-radius:0;cursor:pointer;color:#8a8073;font-size:0.7rem;line-height:1;padding:0 4px";

// ── Toaster ──────────────────────────────────────────────────────────────────
// A toast slides in from the right edge and slides back out as it leaves. Built
// straight from the `transition` primitive (opacity + transform frames) rather
// than the vertical `slideIn` helper, to exercise a horizontal motion. On
// dismiss the keyed renderer also collapses the toast's height so the stack
// closes the gap.
const toastMotion = transition({
  enter: {
    from: {
      opacity: some(box("Float")(0)),
      transform: some("translateX(110%)"),
    },
    to: {
      opacity: some(box("Float")(1)),
      transform: some("translateX(0)"),
    },
    durationMs: 300,
    easing: easeOut,
  },
  exit: {
    from: {
      opacity: some(box("Float")(1)),
      transform: some("translateX(0)"),
    },
    to: {
      opacity: some(box("Float")(0)),
      transform: some("translateX(110%)"),
    },
    durationMs: 220,
    easing: easeIn,
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
            fadeIn(220),
            fadeOut(180),
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
              sx.shadow("md"),
              sx.flexCol,
              sx.gap(3),
            ),
            fadeIn(220),
            fadeOut(180),
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
                    class_("modal-cancel"),
                    sx.style_(
                      sx.color("muted"),
                      sx.hover(sx.color("text")),
                      sx.focus(
                        sx.outline("primary"),
                      ),
                    ),
                    attr("style", GHOST_BTN_GEO),
                    onClick<Msg>({
                      kind: "ClearCancelled",
                    }),
                  ],
                  [text("Cancel")],
                ),
                button(
                  [
                    class_("modal-confirm"),
                    // solid danger block, flat — fill flips to ink on hover
                    sx.style_(
                      sx.bg("danger"),
                      sx.hover(sx.bg("text")),
                      sx.focus(
                        sx.outline("danger"),
                      ),
                    ),
                    attr(
                      "style",
                      PRIMARY_BTN_GEO,
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
          // the hook string keeps the `.filter`/`.selected` test selectors;
          // selected = solid accent, unselected = muted text with a sand hover.
          sx.style_(
            model.filter === filter
              ? "filter selected"
              : "filter",
            sx.focus(sx.outline("primary")),
            ...(model.filter === filter
              ? [
                  sx.bg("primary"),
                  sx.color("primary-text"),
                ]
              : [
                  sx.color("muted"),
                  sx.hover(sx.bg("surface-2")),
                ]),
          ),
          attr("style", FILTER_GEO),
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
        // flat sand blocks (no border, no radius) on the white sheet; a left
        // accent rule gives each row a crisp edge
        sx.bg("surface-2"),
      ),
      attr(
        "style",
        "border-left:3px solid #1f6b54;padding-left:0.9rem",
      ),
      // a new item fades in; a removed / filtered-out one fades out before the
      // renderer detaches it (the deferred-removal exit lifecycle)
      fadeIn(240),
      fadeOut(200),
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
          // reorder controls — clicking drives a keyed swap the renderer FLIPs
          div(
            [
              class_("todo-reorder"),
              sx.style_(sx.flexCol),
            ],
            [
              button(
                [
                  class_("todo-up"),
                  attr(
                    "style",
                    REORDER_BTN_STYLE,
                  ),
                  onClick<Msg>({
                    kind: "Moved",
                    id: todo.id,
                    delta: -1,
                  }),
                ],
                [text("▲")],
              ),
              button(
                [
                  class_("todo-down"),
                  attr(
                    "style",
                    REORDER_BTN_STYLE,
                  ),
                  onClick<Msg>({
                    kind: "Moved",
                    id: todo.id,
                    delta: 1,
                  }),
                ],
                [text("▼")],
              ),
            ],
          ),
          button(
            [
              class_("todo-delete"),
              // ghost: brick text that darkens to ink on hover — no heavy block
              sx.style_(
                sx.color("danger"),
                sx.hover(sx.color("text")),
                sx.focus(sx.outline("danger")),
              ),
              attr("style", GHOST_BTN_GEO),
              onClick<Msg>({
                kind: "Deleted",
                id: todo.id,
              }),
            ],
            [text("Delete")],
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
            `display:grid;grid-template-rows:${isOpen ? "1fr" : "0fr"};transition:grid-template-rows 300ms ${easeOut}`,
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
    // full-width page wrapper: cream "paper" canvas, centered card, humanist
    // sans body. The editorial palette comes from the design tokens.
    [
      sx.style_(sx.flex, sx.justify("center")),
      attr(
        "style",
        "min-height:100vh;padding:clamp(2rem,6vw,5rem) 1.5rem;background:#f4ecda;color:#2a241d;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif",
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
            sx.gap(5),
            sx.bg("surface"),
          ),
          // a flat framed sheet: square, a single hairline rule, no soft shadow
          attr(
            "style",
            "padding:clamp(1.5rem,4vw,2.75rem);border:1px solid #e6dcc8",
          ),
        ],
        [
          header(
            [
              class_("todos-header"),
              sx.style_(sx.flexCol, sx.gap(2)),
            ],
            [
              // monospace eyebrow — a small editorial label in the accent
              span(
                [
                  attr(
                    "style",
                    "font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:0.7rem;letter-spacing:0.22em;text-transform:uppercase;color:#1f6b54;font-weight:600",
                  ),
                ],
                [text("A plgg demo · SSR + CSR")],
              ),
              h1(
                [
                  // serif display title — characterful, tight tracking
                  attr(
                    "style",
                    "margin:0;font-family:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,ui-serif,serif;font-size:clamp(1.9rem,5vw,2.4rem);line-height:1.05;letter-spacing:-0.02em;font-weight:600",
                  ),
                ],
                [text("Things to do")],
              ),
              p(
                [
                  sx.style_(
                    sx.color("muted"),
                    sx.text("sm"),
                  ),
                  attr(
                    "style",
                    "margin:0;line-height:1.55;max-width:46ch",
                  ),
                ],
                [
                  text(
                    "One pure Model/update/view, rendered on the server and taken over by the client on plgg-view. Add, reorder, expand, and clear — filter and search reflect to the URL.",
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
                  attr("style", FIELD_GEO),
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
                  attr("style", PRIMARY_BTN_GEO),
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
                  attr("style", FIELD_GEO),
                  onInput<Msg>((value) => ({
                    kind: "SearchChanged",
                    value,
                  })),
                ],
                [],
              ),
              // opens the clear-completed confirmation modal — a quiet ghost link
              button(
                [
                  class_("clear-completed"),
                  sx.style_(
                    sx.color("muted"),
                    sx.hover(sx.color("danger")),
                    sx.focus(
                      sx.outline("danger"),
                    ),
                  ),
                  attr("style", GHOST_BTN_GEO),
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
