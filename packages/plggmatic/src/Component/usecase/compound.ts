import {
  type SoftStr,
  type Option,
  matchOption,
} from "plgg";
import {
  type Html,
  el,
  text,
  attr,
  onClick,
} from "plgg-view";
import {
  backdropClass,
  calendarClass,
  calendarDayClass,
  calendarGridClass,
  calendarHeadClass,
  drawerBodyClass,
  drawerClass,
  drawerHeadClass,
  iconButtonClass,
  modalClass,
  numericClass,
  sideAttr,
  sortClass,
  tableClass,
  tableWrapClass,
} from "plggmatic/Meta/model/classHooks";

/**
 * A DRAWER: a panel that comes in from an edge and
 * stands over the page, for work that belongs to the
 * page but should not replace it. It is drawn only
 * while it is open — whether it is open is the caller's
 * state. A press on the dimmed page or on the close
 * button asks to close.
 */
export type DrawerProps<Msg> = Readonly<{
  title: SoftStr;
  side: "left" | "right";
  closeLabel: SoftStr;
  onClose: Msg;
  body: ReadonlyArray<Html<Msg>>;
}>;
export const drawer = <Msg>(
  props: DrawerProps<Msg>,
): Html<Msg> =>
  el(
    "div",
    [attr("class", modalClass)],
    [
      el(
        "div",
        [
          attr("class", backdropClass),
          onClick(props.onClose),
        ],
        [],
      ),
      el(
        "aside",
        [
          attr("class", drawerClass),
          attr(sideAttr, props.side),
          attr("role", "dialog"),
          attr("aria-modal", "true"),
          attr("aria-label", props.title),
        ],
        [
          el(
            "div",
            [attr("class", drawerHeadClass)],
            [
              el("span", [], [text(props.title)]),
              el(
                "button",
                [
                  attr("type", "button"),
                  attr("class", iconButtonClass),
                  attr(
                    "aria-label",
                    props.closeLabel,
                  ),
                  onClick(props.onClose),
                ],
                [
                  el(
                    "span",
                    [attr("aria-hidden", "true")],
                    [text("×")],
                  ),
                ],
              ),
            ],
          ),
          el(
            "div",
            [attr("class", drawerBodyClass)],
            props.body,
          ),
        ],
      ),
    ],
  );

/** How a table is ordered: by which column, and whether
 * from the largest down. */
export type Sort = Readonly<{
  by: SoftStr;
  descending: boolean;
}>;

/** The order after a heading is pressed: the same column
 * turns round; another column starts from the smallest. */
export const sortedOn = (
  sort: Sort,
  id: SoftStr,
): Sort => ({
  by: id,
  descending:
    sort.by === id ? !sort.descending : false,
});

/** Rows put in order by what one of them is read as:
 * numbers by size, words by the alphabet. */
export const sortedBy = <T>(
  rows: ReadonlyArray<T>,
  read: (row: T) => SoftStr | number,
  descending: boolean,
): ReadonlyArray<T> =>
  [...rows].sort(
    (a: T, b: T) =>
      (descending ? -1 : 1) *
      between(read(a), read(b)),
  );
const between = (
  a: SoftStr | number,
  b: SoftStr | number,
): number =>
  typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b));

/**
 * A SORTABLE TABLE: a table whose headings order it. A
 * heading that can order is a real button; the column
 * the table is ordered by says so, and in which
 * direction, to a screen reader too. Ordering the rows
 * is the caller's — {@link sortedBy} does it.
 */
export type SortColumn = Readonly<{
  id: SoftStr;
  label: SoftStr;
  numeric: boolean;
  sortable: boolean;
}>;
export type SortTableProps<Msg> = Readonly<{
  caption: SoftStr;
  columns: ReadonlyArray<SortColumn>;
  rows: ReadonlyArray<ReadonlyArray<Html<Msg>>>;
  sort: Sort;
  onSort: (id: SoftStr) => Msg;
}>;
const numeric = (
  numbers: boolean,
): ReadonlyArray<ReturnType<typeof attr>> =>
  numbers ? [attr("class", numericClass)] : [];
export const sortTable = <Msg>(
  props: SortTableProps<Msg>,
): Html<Msg> =>
  el(
    "div",
    [attr("class", tableWrapClass)],
    [
      el(
        "table",
        [
          attr("class", tableClass),
          attr("aria-label", props.caption),
        ],
        [
          el(
            "thead",
            [],
            [
              el(
                "tr",
                [],
                props.columns.map(
                  (c: SortColumn) =>
                    el<Msg>(
                      "th",
                      [
                        attr("scope", "col"),
                        ...numeric(c.numeric),
                        ...(c.sortable
                          ? [
                              attr(
                                "aria-sort",
                                props.sort.by !==
                                  c.id
                                  ? "none"
                                  : props.sort
                                        .descending
                                    ? "descending"
                                    : "ascending",
                              ),
                            ]
                          : []),
                      ],
                      [
                        c.sortable
                          ? el<Msg>(
                              "button",
                              [
                                attr(
                                  "type",
                                  "button",
                                ),
                                attr(
                                  "class",
                                  sortClass,
                                ),
                                onClick(
                                  props.onSort(
                                    c.id,
                                  ),
                                ),
                              ],
                              [text(c.label)],
                            )
                          : text(c.label),
                      ],
                    ),
                ),
              ),
            ],
          ),
          el(
            "tbody",
            [],
            props.rows.map(
              (cells: ReadonlyArray<Html<Msg>>) =>
                el(
                  "tr",
                  [],
                  cells.map(
                    (
                      cell: Html<Msg>,
                      i: number,
                    ) =>
                      el(
                        "td",
                        numeric(
                          props.columns.some(
                            (
                              c: SortColumn,
                              at: number,
                            ) =>
                              at === i &&
                              c.numeric,
                          ),
                        ),
                        [cell],
                      ),
                  ),
                ),
            ),
          ),
        ],
      ),
    ],
  );

/** The weeks of a month, Sunday first: the day of the
 * month in each cell, and zero where the week reaches
 * outside the month. `month` counts from one. */
export const monthWeeks = (
  year: number,
  month: number,
): ReadonlyArray<ReadonlyArray<number>> =>
  weeksOf(
    new Date(
      Date.UTC(year, month - 1, 1),
    ).getUTCDay(),
    new Date(
      Date.UTC(year, month, 0),
    ).getUTCDate(),
  );
const weeksOf = (
  lead: number,
  days: number,
): ReadonlyArray<ReadonlyArray<number>> =>
  Array.from(
    { length: Math.ceil((lead + days) / 7) },
    (_: unknown, week: number) =>
      Array.from(
        { length: 7 },
        (_: unknown, at: number) =>
          week * 7 + at - lead + 1,
      ).map((day: number) =>
        day < 1 || day > days ? 0 : day,
      ),
  );

/**
 * A CALENDAR: a month, a day to a cell, a day picked
 * with a press. Which month is shown and which day is
 * picked are the caller's state; the title above it is
 * the caller's words, so the month reads in the page's
 * own language.
 */
export type CalendarProps<Msg> = Readonly<{
  title: SoftStr;
  year: number;
  month: number;
  chosen: Option<number>;
  weekdays: ReadonlyArray<SoftStr>;
  previousLabel: SoftStr;
  nextLabel: SoftStr;
  onPrevious: Msg;
  onNext: Msg;
  onPick: (day: number) => Msg;
}>;
const turn = <Msg>(
  label: SoftStr,
  glyph: SoftStr,
  on: Msg,
): Html<Msg> =>
  el(
    "button",
    [
      attr("type", "button"),
      attr("class", iconButtonClass),
      attr("aria-label", label),
      onClick(on),
    ],
    [
      el(
        "span",
        [attr("aria-hidden", "true")],
        [text(glyph)],
      ),
    ],
  );
export const calendar = <Msg>(
  props: CalendarProps<Msg>,
): Html<Msg> =>
  el(
    "div",
    [attr("class", calendarClass)],
    [
      el(
        "div",
        [attr("class", calendarHeadClass)],
        [
          turn(
            props.previousLabel,
            "‹",
            props.onPrevious,
          ),
          el(
            "span",
            [attr("aria-live", "polite")],
            [text(props.title)],
          ),
          turn(
            props.nextLabel,
            "›",
            props.onNext,
          ),
        ],
      ),
      el(
        "table",
        [
          attr("class", calendarGridClass),
          attr("aria-label", props.title),
        ],
        [
          el(
            "thead",
            [],
            [
              el(
                "tr",
                [],
                props.weekdays.map(
                  (name: SoftStr) =>
                    el<Msg>(
                      "th",
                      [attr("scope", "col")],
                      [text(name)],
                    ),
                ),
              ),
            ],
          ),
          el(
            "tbody",
            [],
            monthWeeks(
              props.year,
              props.month,
            ).map((week: ReadonlyArray<number>) =>
              el<Msg>(
                "tr",
                [],
                week.map((day: number) =>
                  el<Msg>(
                    "td",
                    [],
                    day === 0
                      ? []
                      : [
                          el<Msg>(
                            "button",
                            [
                              attr(
                                "type",
                                "button",
                              ),
                              attr(
                                "class",
                                calendarDayClass,
                              ),
                              attr(
                                "aria-pressed",
                                matchOption<
                                  number,
                                  boolean
                                >(
                                  () => false,
                                  (d: number) =>
                                    d === day,
                                )(props.chosen)
                                  ? "true"
                                  : "false",
                              ),
                              onClick(
                                props.onPick(day),
                              ),
                            ],
                            [text(String(day))],
                          ),
                        ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    ],
  );
