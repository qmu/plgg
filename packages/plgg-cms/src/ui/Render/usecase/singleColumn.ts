import {
  type SoftStr,
  type Option,
  none,
  some,
  matchOption,
  match,
} from "plgg";
import {
  type Html,
  slot,
  span,
  text,
  attr,
} from "plgg-view";
import {
  column,
  navPane,
  mainPane,
} from "plgg-cms/ui/Layout/usecase/combinators";
import { heading } from "plgg-cms/ui/Component/usecase/typography";
import { type SchedulerMsg } from "plgg-cms/ui/Schedule/model/Msg";
import {
  type Scene,
  type ActionButton,
  menuLevel$,
  listLevel$,
  detailLevel$,
} from "plgg-cms/ui/Schedule/model/Scene";
import { type Row } from "plgg-cms/ui/Declare/model/Row";
import { cssPrefix } from "plgg-cms/ui/Meta/model/identity";
import {
  type Screen,
  currentScreen,
} from "plgg-cms/ui/Render/model/screen";
import {
  confirmOverlay,
  actionRow,
  queryField,
  rowList,
  menuNav,
  loadingHint,
  errorHint,
  detailFields,
  backControl,
} from "plgg-cms/ui/Render/usecase/parts";

/**
 * The SINGLE-COLUMN mode renderer (D10) — one operation
 * per screen. A pure projection of the SAME scheduled
 * {@link Scene} the multi-column renderer draws: the
 * current screen is derived (the deepest level), the menu
 * screen is a `navigation` landmark and every other screen
 * a single `main`, and each non-root screen shows a
 * labelled back affordance (a truncating link — the
 * runtime turns the click into the scheduler's navigation,
 * and browser Back pops one screen because traversal
 * pushes history). Shares the interactive pieces with the
 * multi-column renderer through {@link parts}, so the two
 * modes stay in parity. Holds no state, touches no
 * `window`.
 */
export const singleColumn = (
  scene: Scene,
): Html<SchedulerMsg, "div"> =>
  slot(
    [attr("class", `${cssPrefix}-single`)],
    [
      ...confirmOverlay(scene.confirm),
      matchOption<Screen, Html<SchedulerMsg>>(
        () =>
          column(
            [],
            [
              span(
                [
                  attr(
                    "class",
                    `${cssPrefix}-hint`,
                  ),
                ],
                [text("Nothing to show")],
              ),
            ],
          ),
        (screen: Screen) => screenView(screen),
      )(currentScreen(scene)),
    ],
  );

const screenView = (
  screen: Screen,
): Html<SchedulerMsg> =>
  match(screen)(
    [
      menuLevel$(),
      ({ content }): Html<SchedulerMsg> =>
        column(
          [],
          [
            navPane(
              [],
              [
                screenTitle(content.title),
                menuNav(content.entries),
              ],
            ),
          ],
        ),
    ],
    [
      listLevel$(),
      ({ content }): Html<SchedulerMsg> =>
        column(
          [],
          [
            mainPane(
              [],
              [
                ...backControl(content.back),
                screenTitle(content.title),
                ...queryField(content.query),
                ...loadingHint(content.loading),
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
    [
      detailLevel$(),
      ({ content }): Html<SchedulerMsg> =>
        column(
          [],
          [
            mainPane(
              [],
              [
                ...backControl(content.back),
                screenTitle(content.title),
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
  );

const screenTitle = (
  title: SoftStr,
): Html<SchedulerMsg> => heading(2, title);

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
