import {
  type SoftStr,
  type Option,
  some,
  none,
  matchOption,
  match,
} from "plgg";
import {
  type Html,
  slot,
  span,
  a,
  ul,
  li,
  button,
  input,
  text,
  h1,
  href,
  attr,
  onClick,
  onInput,
} from "plgg-view";
import {
  type SchedulerMsg,
  type Scene,
  type Level,
  type Row,
  type ConfirmPrompt,
  type ActionButton,
  type QueryState,
  type RowLink,
  type MenuLink,
  queryInput,
  requestAction,
  confirmAction,
  cancelAction,
  menuLevel$,
  listLevel$,
  detailLevel$,
} from "plggmatic";

/**
 * A deliberately CRUDE renderer over the scheduled
 * {@link Scene} — plain lists and buttons wrapped in
 * `slot` containers, no Layout panes, NOT the framework's
 * real renderer (tickets 10/11). Its only job is to prove
 * the renderer seam is sufficient: every level, the query
 * box, the action buttons, and the confirmation dialog
 * are drawable from the `Scene` alone, and navigation is
 * links (the runtime turns an in-app `<a>` click into an
 * `onUrlChange`).
 */

const actionButtons = (
  collection: SoftStr,
  target: Option<SoftStr>,
  actions: ReadonlyArray<ActionButton>,
): ReadonlyArray<Html<SchedulerMsg>> =>
  actions.map((ab: ActionButton) =>
    button(
      [
        attr(
          "class",
          ab.destructive
            ? "sd-btn sd-btn-danger"
            : "sd-btn",
        ),
        onClick(
          requestAction(
            collection,
            ab.id,
            target,
          ),
        ),
      ],
      [text(ab.label)],
    ),
  );

const backLink = (
  back: Option<SoftStr>,
): ReadonlyArray<Html<SchedulerMsg>> =>
  matchOption<
    SoftStr,
    ReadonlyArray<Html<SchedulerMsg>>
  >(
    () => [],
    (to: SoftStr) => [
      a(
        [href(to), attr("class", "sd-back")],
        [text("← back")],
      ),
    ],
  )(back);

const queryBox = (
  q: Option<QueryState>,
): ReadonlyArray<Html<SchedulerMsg>> =>
  matchOption<
    QueryState,
    ReadonlyArray<Html<SchedulerMsg>>
  >(
    () => [],
    (state: QueryState) => [
      input(
        [
          attr("type", "search"),
          attr("class", "sd-query"),
          attr("value", state.text),
          attr("placeholder", state.placeholder),
          onInput((v: SoftStr) => queryInput(v)),
        ],
        [],
      ),
    ],
  )(q);

const rowItem = (
  r: RowLink,
): Html<SchedulerMsg, "li"> =>
  li(
    [],
    [
      a(
        [
          href(r.href),
          ...(r.active
            ? [attr("aria-current", "page")]
            : []),
        ],
        [text(r.row.label)],
      ),
    ],
  );

const menuItem = (
  e: MenuLink,
): Html<SchedulerMsg, "li"> =>
  li(
    [],
    [
      a(
        [
          href(e.href),
          ...(e.active
            ? [attr("aria-current", "page")]
            : []),
        ],
        [text(e.label)],
      ),
    ],
  );

const menuLevelView = (
  title: SoftStr,
  entries: ReadonlyArray<MenuLink>,
): Html<SchedulerMsg, "div"> =>
  slot(
    [attr("class", "sd-level sd-menu")],
    [
      span(
        [attr("class", "sd-title")],
        [text(title)],
      ),
      ul(
        [attr("class", "sd-list")],
        entries.map(menuItem),
      ),
    ],
  );

const errorHint = (
  error: Option<SoftStr>,
): ReadonlyArray<Html<SchedulerMsg>> =>
  matchOption<
    SoftStr,
    ReadonlyArray<Html<SchedulerMsg>>
  >(
    () => [],
    (e: SoftStr) => [
      span(
        [attr("class", "sd-error")],
        [text(`Failed: ${e}`)],
      ),
    ],
  )(error);

const listLevelView = (l: {
  collection: SoftStr;
  title: SoftStr;
  back: Option<SoftStr>;
  query: Option<QueryState>;
  rows: ReadonlyArray<RowLink>;
  loading: boolean;
  error: Option<SoftStr>;
  actions: ReadonlyArray<ActionButton>;
}): Html<SchedulerMsg, "div"> =>
  slot(
    [attr("class", "sd-level sd-list-level")],
    [
      span(
        [attr("class", "sd-title")],
        [text(l.title)],
      ),
      ...backLink(l.back),
      ...queryBox(l.query),
      ...(l.loading
        ? [
            span(
              [attr("class", "sd-hint")],
              [text("Loading…")],
            ),
          ]
        : []),
      ...errorHint(l.error),
      ul(
        [attr("class", "sd-list")],
        l.rows.map(rowItem),
      ),
      slot(
        [attr("class", "sd-actions")],
        actionButtons(
          l.collection,
          none(),
          l.actions,
        ),
      ),
    ],
  );

const detailBody = (
  r: Row,
  collection: SoftStr,
  actions: ReadonlyArray<ActionButton>,
): ReadonlyArray<Html<SchedulerMsg>> => [
  h1([], [text(r.label)]),
  slot(
    [attr("class", "sd-fields")],
    r.fields.map((f) =>
      slot(
        [attr("class", "sd-field")],
        [text(f.value)],
      ),
    ),
  ),
  slot(
    [attr("class", "sd-actions")],
    actionButtons(collection, some(r.id), actions),
  ),
];

const detailLevelView = (l: {
  collection: SoftStr;
  title: SoftStr;
  back: Option<SoftStr>;
  row: Option<Row>;
  actions: ReadonlyArray<ActionButton>;
}): Html<SchedulerMsg, "div"> =>
  slot(
    [attr("class", "sd-level sd-detail")],
    [
      span(
        [attr("class", "sd-title")],
        [text(l.title)],
      ),
      ...backLink(l.back),
      ...matchOption<
        Row,
        ReadonlyArray<Html<SchedulerMsg>>
      >(
        () => [
          span(
            [attr("class", "sd-hint")],
            [text("Not found")],
          ),
        ],
        (r: Row) =>
          detailBody(r, l.collection, l.actions),
      )(l.row),
    ],
  );

const levelView = (
  level: Level,
): Html<SchedulerMsg, "div"> =>
  match(level)(
    [
      menuLevel$(),
      ({ content }): Html<SchedulerMsg, "div"> =>
        menuLevelView(
          content.title,
          content.entries,
        ),
    ],
    [
      listLevel$(),
      ({ content }): Html<SchedulerMsg, "div"> =>
        listLevelView(content),
    ],
    [
      detailLevel$(),
      ({ content }): Html<SchedulerMsg, "div"> =>
        detailLevelView(content),
    ],
  );

const confirmBar = (
  c: ConfirmPrompt,
): Html<SchedulerMsg, "div"> =>
  slot(
    [
      attr(
        "class",
        c.destructive
          ? "sd-confirm sd-confirm-danger"
          : "sd-confirm",
      ),
    ],
    [
      span([], [text(c.prompt)]),
      button(
        [
          attr("class", "sd-btn sd-btn-danger"),
          onClick(confirmAction()),
        ],
        [text("Confirm")],
      ),
      button(
        [
          attr("class", "sd-btn"),
          onClick(cancelAction()),
        ],
        [text("Cancel")],
      ),
    ],
  );

/** Renders a whole {@link Scene} into DOM markup. */
export const render = (
  scene: Scene,
): Html<SchedulerMsg, "div"> =>
  slot(
    [attr("class", "sd-root")],
    [
      h1(
        [attr("class", "sd-app-title")],
        [text(scene.title)],
      ),
      ...matchOption<
        ConfirmPrompt,
        ReadonlyArray<Html<SchedulerMsg>>
      >(
        () => [],
        (c: ConfirmPrompt) => [confirmBar(c)],
      )(scene.confirm),
      slot(
        [attr("class", "sd-levels")],
        scene.levels.map(levelView),
      ),
    ],
  );
