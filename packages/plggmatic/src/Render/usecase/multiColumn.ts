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
  text,
  attr,
  key,
  fadeIn,
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
import {
  type Crumb,
  breadcrumb,
} from "plggmatic/Component/usecase/breadcrumb";
import { colHead } from "plggmatic/Component/usecase/colHead";
import { type SchedulerMsg } from "plggmatic/Schedule/model/Msg";
import {
  type Scene,
  type Level,
  type ActionButton,
  menuLevel$,
  listLevel$,
  detailLevel$,
} from "plggmatic/Schedule/model/Scene";
import { type Row } from "plggmatic/Declare/model/Row";
import { cssPrefix } from "plggmatic/Meta/model/identity";
import {
  confirmOverlay,
  actionRow,
  queryField,
  rowList,
  menuNav,
  loadingHint,
  errorHint,
  detailFields,
} from "plggmatic/Render/usecase/parts";

/**
 * The MULTI-COLUMN mode renderer (D10) — a pure
 * projection of ticket 09's scheduled {@link Scene} into
 * the panes-expanding-rightward arrangement the workbench
 * example hand-wrote. Each flow `Level` becomes a column
 * (the menu a `navigation` pane, a list a `complementary`
 * pane, a detail the `main` pane), with a `colHead`
 * carrying the truncating close link, pushed columns
 * keyed + entrance-faded, and a breadcrumb trail above.
 * The interactive pieces (query, actions, confirmation)
 * come from the shared {@link parts}, so this renderer and
 * the single-column one (ticket 11) stay in parity.
 * Column widths are renderer defaults (menu 220px, list
 * 300px, detail fluid) — the mode-private geometry the
 * design tenets keep out of the vocabulary.
 */
export const multiColumn = (
  scene: Scene,
): Html<SchedulerMsg, "div"> =>
  slot(
    [attr("class", `${cssPrefix}-scheduler`)],
    [
      breadcrumb<SchedulerMsg>(crumbsOf(scene)),
      ...confirmOverlay(scene.confirm),
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

const backOf = (level: Level): Option<SoftStr> =>
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

const detailBody = (
  collection: SoftStr,
  detailRow: Option<Row>,
  actions: ReadonlyArray<ActionButton>,
): ReadonlyArray<Html<SchedulerMsg>> =>
  matchOption<
    Row,
    ReadonlyArray<Html<SchedulerMsg>>
  >(
    () => [
      span(
        [attr("class", `${cssPrefix}-hint`)],
        [text("Not found")],
      ),
    ],
    (r: Row) => [
      detailFields(r.fields),
      ...actionRow(
        collection,
        some(r.id),
        actions,
      ),
    ],
  )(detailRow);

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
                    ...loadingHint(
                      content.loading,
                    ),
                    ...errorHint(content.error),
                    rowList(content.rows),
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
  detailRow: Option<Row>,
): Option<SoftStr> =>
  matchOption<Row, Option<SoftStr>>(
    () => none(),
    (r: Row) => some(r.id),
  )(detailRow);
