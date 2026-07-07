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
  mapHtml,
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

export type HeaderLink = Readonly<{
  collection: SoftStr;
  label: SoftStr;
  href: SoftStr;
}>;

export type ExtraColumn<Msg> = Readonly<{
  key: SoftStr;
  title: SoftStr;
  close: Option<SoftStr>;
  body: ReadonlyArray<Html<Msg>>;
}>;

export type MultiColumnOptions<Msg> = Readonly<{
  mapMsg: (msg: SchedulerMsg) => Msg;
  headerLinks?: ReadonlyArray<HeaderLink>;
  extraColumns?: ReadonlyArray<ExtraColumn<Msg>>;
  /**
   * When true, the internal breadcrumb is not rendered —
   * the consumer renders its own, e.g. in an app navbar.
   */
  omitBreadcrumb?: boolean;
}>;

/**
 * The MULTI-COLUMN mode renderer (D10) — a pure
 * projection of ticket 09's scheduled {@link Scene} into
 * panes expanding rightward. The base renderer is kept
 * lightweight; consumers that need app-specific actions or
 * forms can use {@link multiColumnWith} to add header links
 * and arbitrary extra columns without teaching the
 * scheduler those domain concepts.
 */
export const multiColumn = (
  scene: Scene,
): Html<SchedulerMsg, "div"> =>
  multiColumnWith<SchedulerMsg>(scene, {
    mapMsg: (msg: SchedulerMsg) => msg,
  });

export const multiColumnWith = <Msg>(
  scene: Scene,
  options: MultiColumnOptions<Msg>,
): Html<Msg, "div"> =>
  slot(
    [attr("class", `${cssPrefix}-scheduler`)],
    [
      ...(options.omitBreadcrumb === true
        ? []
        : [breadcrumb<Msg>(crumbsOf(scene))]),
      ...confirmOverlay(scene.confirm).map(
        mapScheduler(options),
      ),
      row<Msg>(
        [],
        [
          ...scene.levels.map((level: Level) =>
            columnFor(level, options),
          ),
          ...(
            options.extraColumns ?? []
          ).map(extraColumn),
        ],
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
 * level's `back` (which truncates to exactly there).
 */
export const crumbsOf = (
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

const headerLinks = (
  collection: SoftStr,
  options: MultiColumnOptions<unknown>,
): ReadonlyArray<
  Readonly<{ label: SoftStr; href: SoftStr }>
> =>
  (options.headerLinks ?? [])
    .filter(
      (link: HeaderLink) =>
        link.collection === collection,
    )
    .map((link: HeaderLink) => ({
      label: link.label,
      href: link.href,
    }));

const mapScheduler =
  <Msg>(options: MultiColumnOptions<Msg>) =>
  (node: Html<SchedulerMsg>): Html<Msg> =>
    mapHtml(options.mapMsg)(node);

const columnFor = <Msg>(
  level: Level,
  options: MultiColumnOptions<Msg>,
): Html<Msg> =>
  match(level)(
    [
      menuLevel$(),
      ({ content }): Html<Msg> =>
        column(
          [basis("220px")],
          [
            navPane(
              [],
              [
                colHead<Msg>({
                  title: content.title,
                  close: none(),
                  links: [],
                }),
                slot(
                  [
                    style_(
                      `${cssPrefix}-menu-body`,
                    ),
                  ],
                  [
                    mapScheduler(options)(
                      menuNav(content.entries),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
    ],
    [
      listLevel$(),
      ({ content }): Html<Msg> =>
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
                    colHead<Msg>({
                      title: content.title,
                      close: content.back,
                      links: headerLinks(
                        content.collection,
                        options,
                      ),
                    }),
                    ...queryField(content.query).map(
                      mapScheduler(options),
                    ),
                    ...loadingHint(
                      content.loading,
                    ).map(mapScheduler(options)),
                    ...errorHint(content.error).map(
                      mapScheduler(options),
                    ),
                    mapScheduler(options)(
                      rowList(content.rows),
                    ),
                    ...actionRow(
                      content.collection,
                      none(),
                      content.actions,
                    ).map(mapScheduler(options)),
                  ],
                ),
              ],
            ),
          ],
        ),
    ],
    [
      detailLevel$(),
      ({ content }): Html<Msg> =>
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
                    colHead<Msg>({
                      title: content.title,
                      close: content.back,
                      links: [],
                    }),
                    ...detailBody(
                      content.collection,
                      content.row,
                      content.actions,
                    ).map(mapScheduler(options)),
                  ],
                ),
              ],
            ),
          ],
        ),
    ],
  );

const extraColumn = <Msg>(
  extra: ExtraColumn<Msg>,
): Html<Msg> =>
  column(
    [fluid],
    [
      mainPane(
        [],
        [
          slot(
            [key(extra.key), fadeIn(150)],
            [
              colHead<Msg>({
                title: extra.title,
                close: extra.close,
                links: [],
              }),
              ...extra.body,
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
