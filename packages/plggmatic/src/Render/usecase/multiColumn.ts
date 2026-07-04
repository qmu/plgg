import {
  type SoftStr,
  type Option,
  some,
  none,
  getOr,
  matchOption,
  match,
  pipe,
  fromNullable,
} from "plgg";
import {
  type Html,
  slot,
  span,
  input,
  button,
  a,
  text,
  attr,
  href,
  onClick,
  onInput,
  key,
  fadeIn,
  ul as ulEl,
  li as liElement,
} from "plgg-view";
import {
  style_,
  basis,
  fluid,
} from "plggmatic/styleEntry";
import {
  row,
  column,
  navPane,
  mainPane,
  asidePane,
} from "plggmatic/Layout/usecase/combinators";
import { type NavItem } from "plggmatic/Component/model/navItem";
import { navTree } from "plggmatic/Component/usecase/navTree";
import {
  type Crumb,
  breadcrumb,
} from "plggmatic/Component/usecase/breadcrumb";
import { colHead } from "plggmatic/Component/usecase/colHead";
import { focusRing } from "plggmatic/Component/model/interaction";
import {
  type SchedulerMsg,
  type Scene,
  type Level,
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
import { cssPrefix } from "plggmatic/Meta/model/identity";

/**
 * The MULTI-COLUMN mode renderer (D10) — a pure
 * projection of ticket 09's scheduled {@link Scene} into
 * the panes-expanding-rightward arrangement the workbench
 * example hand-wrote. Each flow `Level` becomes a column
 * (the menu a `navigation` pane, a list a `complementary`
 * pane, a detail the `main` pane), with a `colHead`
 * carrying the truncating close link, pushed columns
 * keyed + entrance-faded, and a breadcrumb trail above.
 * Navigation is links only (the runtime turns an in-app
 * `<a>` click into `onUrlChange`); the query box, action
 * buttons, and confirmation dispatch scheduler `Msg`s.
 * Landmark roles come from the level kind, never
 * hardcoded. Column widths are renderer defaults (menu
 * 220px, list 300px, detail fluid) — the mode-private
 * geometry the design tenets keep out of the vocabulary.
 */
export const multiColumn = (
  scene: Scene,
): Html<SchedulerMsg, "div"> =>
  slot(
    [attr("class", `${cssPrefix}-scheduler`)],
    [
      breadcrumb<SchedulerMsg>(crumbsOf(scene)),
      ...confirmOverlay(scene),
      row<SchedulerMsg>(
        [],
        scene.levels.map(columnFor),
      ),
    ],
  );

const titleOf = (level: Level): SoftStr =>
  match(level)(
    [
      menuLevel$(),
      ({ content }): SoftStr => content.title,
    ],
    [
      listLevel$(),
      ({ content }): SoftStr => content.title,
    ],
    [
      detailLevel$(),
      ({ content }): SoftStr => content.title,
    ],
  );

const backOf = (
  level: Level,
): Option<SoftStr> =>
  match(level)(
    [menuLevel$(), (): Option<SoftStr> => none()],
    [
      listLevel$(),
      ({ content }): Option<SoftStr> =>
        content.back,
    ],
    [
      detailLevel$(),
      ({ content }): Option<SoftStr> =>
        content.back,
    ],
  );

/**
 * One crumb per level; each crumb links to the URL that
 * makes ITS level the deepest — obtained as the NEXT
 * level's `back` (which truncates to exactly there). The
 * last level (current position) is a plain, link-less
 * crumb.
 */
const crumbsOf = (
  scene: Scene,
): ReadonlyArray<Crumb> =>
  scene.levels.map(
    (level: Level, i: number): Crumb => ({
      label: titleOf(level),
      to: pipe(
        fromNullable(scene.levels[i + 1]),
        matchOption<Level, Option<SoftStr>>(
          () => none(),
          (next: Level) => backOf(next),
        ),
      ),
    }),
  );

const confirmOverlay = (
  scene: Scene,
): ReadonlyArray<Html<SchedulerMsg>> =>
  matchOption<
    Readonly<{
      prompt: SoftStr;
      destructive: boolean;
    }>,
    ReadonlyArray<Html<SchedulerMsg>>
  >(
    () => [],
    (c) => [
      slot(
        [
          attr(
            "class",
            c.destructive
              ? `${cssPrefix}-confirm ${cssPrefix}-confirm-danger`
              : `${cssPrefix}-confirm`,
          ),
          attr("role", "alertdialog"),
        ],
        [
          span([], [text(c.prompt)]),
          button(
            [
              style_(
                `${cssPrefix}-btn`,
                focusRing,
              ),
              onClick(confirmAction()),
            ],
            [text("Confirm")],
          ),
          button(
            [
              style_(
                `${cssPrefix}-btn`,
                focusRing,
              ),
              onClick(cancelAction()),
            ],
            [text("Cancel")],
          ),
        ],
      ),
    ],
  )(scene.confirm);

const actionRow = (
  collection: SoftStr,
  target: Option<SoftStr>,
  actions: ReadonlyArray<ActionButton>,
): ReadonlyArray<Html<SchedulerMsg>> =>
  actions.length === 0
    ? []
    : [
        slot(
          [
            attr(
              "class",
              `${cssPrefix}-actions`,
            ),
          ],
          actions.map((ab: ActionButton) =>
            button(
              [
                style_(
                  `${cssPrefix}-btn`,
                  focusRing,
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
          ),
        ),
      ];

const queryField = (
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
          attr("class", `${cssPrefix}-query`),
          attr("value", state.text),
          attr("placeholder", state.placeholder),
          onInput((v: SoftStr) => queryInput(v)),
        ],
        [],
      ),
    ],
  )(q);

const rowLink = (
  r: RowLink,
): Html<SchedulerMsg, "li"> =>
  liLink(r.href, r.active, r.row.label);

const menuNav = (
  entries: ReadonlyArray<MenuLink>,
): Html<SchedulerMsg> => {
  const items: ReadonlyArray<NavItem> =
    entries.map((e: MenuLink) => ({
      label: e.label,
      href: some(e.href),
      children: [],
    }));
  const active = pipe(
    fromNullable(
      entries.find((e: MenuLink) => e.active),
    ),
    matchOption<MenuLink, SoftStr>(
      () => "",
      (e: MenuLink) => e.href,
    ),
  );
  return navTree(items, active);
};

const columnFor = (
  level: Level,
): Html<SchedulerMsg> =>
  match(level)(
    [
      menuLevel$(),
      ({ content }): Html<SchedulerMsg> =>
        column(
          [basis("220px")],
          [
            navPane(
              [],
              [
                colHead<SchedulerMsg>({
                  title: content.title,
                  close: none(),
                }),
                slot(
                  [
                    style_(
                      `${cssPrefix}-menu-body`,
                    ),
                  ],
                  [menuNav(content.entries)],
                ),
              ],
            ),
          ],
        ),
    ],
    [
      listLevel$(),
      ({ content }): Html<SchedulerMsg> =>
        column(
          [basis("300px")],
          [
            asidePane(
              [],
              [
                slot(
                  [
                    key(
                      `list-${content.collection}`,
                    ),
                    fadeIn(150),
                  ],
                  [
                    colHead<SchedulerMsg>({
                      title: content.title,
                      close: content.back,
                    }),
                    ...queryField(content.query),
                    ...loadingHint(content.loading),
                    ...errorHint(content.error),
                    ulList(
                      content.rows.map(rowLink),
                    ),
                    ...actionRow(
                      content.collection,
                      none(),
                      content.actions,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
    ],
    [
      detailLevel$(),
      ({ content }): Html<SchedulerMsg> =>
        column(
          [fluid],
          [
            mainPane(
              [],
              [
                slot(
                  [
                    key(
                      `detail-${getOr("_")(
                        detailKey(content.row),
                      )}`,
                    ),
                    fadeIn(150),
                  ],
                  [
                    colHead<SchedulerMsg>({
                      title: content.title,
                      close: content.back,
                    }),
                    ...detailBody(
                      content.collection,
                      content.row,
                      content.actions,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
    ],
  );

const detailKey = (
  row: Option<{ id: SoftStr }>,
): Option<SoftStr> =>
  matchOption<{ id: SoftStr }, Option<SoftStr>>(
    () => none(),
    (r) => some(r.id),
  )(row);

const detailBody = (
  collection: SoftStr,
  detailRow: Option<
    Readonly<{
      id: SoftStr;
      label: SoftStr;
      fields: ReadonlyArray<
        Readonly<{ label: SoftStr; value: SoftStr }>
      >;
    }>
  >,
  actions: ReadonlyArray<ActionButton>,
): ReadonlyArray<Html<SchedulerMsg>> =>
  matchOption<
    Readonly<{
      id: SoftStr;
      label: SoftStr;
      fields: ReadonlyArray<
        Readonly<{ label: SoftStr; value: SoftStr }>
      >;
    }>,
    ReadonlyArray<Html<SchedulerMsg>>
  >(
    () => [
      span(
        [attr("class", `${cssPrefix}-hint`)],
        [text("Not found")],
      ),
    ],
    (r) => [
      slot(
        [style_(`${cssPrefix}-detail-body`)],
        [
          ...r.fields.map((f) =>
            slot(
              [
                attr(
                  "class",
                  `${cssPrefix}-field`,
                ),
              ],
              [text(f.value)],
            ),
          ),
        ],
      ),
      ...actionRow(collection, some(r.id), actions),
    ],
  )(detailRow);

// --- small shared element helpers -----------------

const liLink = (
  to: SoftStr,
  active: boolean,
  label: SoftStr,
): Html<SchedulerMsg, "li"> =>
  liElement(
    [],
    [
      a(
        [
          href(to),
          ...(active
            ? [attr("aria-current", "page")]
            : []),
          style_(
            `${cssPrefix}-row-link`,
            focusRing,
          ),
        ],
        [text(label)],
      ),
    ],
  );

const loadingHint = (
  loading: boolean,
): ReadonlyArray<Html<SchedulerMsg>> =>
  loading
    ? [
        span(
          [attr("class", `${cssPrefix}-hint`)],
          [text("Loading…")],
        ),
      ]
    : [];

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
        [attr("class", `${cssPrefix}-error`)],
        [text(`Failed: ${e}`)],
      ),
    ],
  )(error);

const ulList = (
  items: ReadonlyArray<Html<SchedulerMsg, "li">>,
): Html<SchedulerMsg, "ul"> =>
  ulEl(
    [style_(`${cssPrefix}-list`)],
    items,
  );
