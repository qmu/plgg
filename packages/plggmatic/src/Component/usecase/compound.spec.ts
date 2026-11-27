import {
  test,
  check,
  toBe,
  toEqual,
} from "plgg-test";
import { type Option, some, none } from "plgg";
import { renderToString, text } from "plgg-view";
import {
  calendar,
  drawer,
  monthWeeks,
  sortTable,
  sortedBy,
  sortedOn,
} from "plggmatic/Component/usecase/compound";

const same = (v: string): string => v;

test("a drawer is a labelled dialog on the side it is given, over a backdrop", () =>
  check(
    renderToString(
      drawer({
        title: "絞り込み",
        side: "right",
        closeLabel: "閉じる",
        onClose: "close",
        body: [text("中身")],
      }),
    ),
    toBe(
      '<div class="pm-modal"><div class="pm-backdrop"></div><aside class="pm-drawer" data-pm-side="right" role="dialog" aria-modal="true" aria-label="絞り込み"><div class="pm-drawer-head"><span>絞り込み</span><button type="button" class="pm-icon-btn" aria-label="閉じる"><span aria-hidden="true">×</span></button></div><div class="pm-drawer-body">中身</div></aside></div>',
    ),
  ));

test("pressing the ordered column turns it round", () =>
  check(
    sortedOn(
      { by: "name", descending: false },
      "name",
    ),
    toEqual({ by: "name", descending: true }),
  ));

test("pressing another column starts from the smallest", () =>
  check(
    sortedOn(
      { by: "name", descending: true },
      "price",
    ),
    toEqual({ by: "price", descending: false }),
  ));

test("numbers are ordered by size, not as words", () =>
  check(
    sortedBy(
      [10, 9, 100],
      (n: number): number => n,
      false,
    ),
    toEqual([9, 10, 100]),
  ));

test("descending turns the order round and leaves the rows given alone", () =>
  check(
    sortedBy(
      ["b", "c", "a"],
      (s: string): string => s,
      true,
    ),
    toEqual(["c", "b", "a"]),
  ));

test("a sortable table says which column orders it, and only sortable headings are buttons", () =>
  check(
    renderToString(
      sortTable({
        caption: "料金",
        columns: [
          {
            id: "name",
            label: "名前",
            numeric: false,
            sortable: true,
          },
          {
            id: "price",
            label: "月額",
            numeric: true,
            sortable: true,
          },
          {
            id: "note",
            label: "備考",
            numeric: false,
            sortable: false,
          },
        ],
        rows: [
          [text("A"), text("100"), text("—")],
        ],
        sort: { by: "price", descending: true },
        onSort: same,
      }),
    ),
    toBe(
      '<div class="pm-table-wrap"><table class="pm-table" aria-label="料金"><thead><tr><th scope="col" aria-sort="none"><button type="button" class="pm-sort">名前</button></th><th scope="col" class="pm-num" aria-sort="descending"><button type="button" class="pm-sort">月額</button></th><th scope="col">備考</th></tr></thead><tbody><tr><td>A</td><td class="pm-num">100</td><td>—</td></tr></tbody></table></div>',
    ),
  ));

test("a month's weeks start on Sunday and are blank outside the month", () =>
  check(
    monthWeeks(2026, 11),
    toEqual([
      [1, 2, 3, 4, 5, 6, 7],
      [8, 9, 10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19, 20, 21],
      [22, 23, 24, 25, 26, 27, 28],
      [29, 30, 0, 0, 0, 0, 0],
    ]),
  ));

test("February of a leap year has twenty-nine days", () =>
  check(
    monthWeeks(2028, 2)
      .flat()
      .filter((d: number) => d > 0).length,
    toBe(29),
  ));

const month = (chosen: Option<number>): string =>
  renderToString(
    calendar({
      title: "2026年11月",
      year: 2026,
      month: 11,
      chosen,
      weekdays: [
        "日",
        "月",
        "火",
        "水",
        "木",
        "金",
        "土",
      ],
      previousLabel: "前の月",
      nextLabel: "次の月",
      onPrevious: "prev",
      onNext: "next",
      onPick: (day: number): string =>
        String(day),
    }),
  );

test("a calendar presses exactly the chosen day", () =>
  check(
    month(some(27)).split('aria-pressed="true"')
      .length - 1,
    toBe(1),
  ));

test("a calendar with no day chosen presses none, and draws a button a day", () =>
  check(
    [
      month(none()).includes(
        'aria-pressed="true"',
      ),
      month(none()).split("pm-calendar-day")
        .length - 1,
    ],
    toEqual([false, 30]),
  ));
