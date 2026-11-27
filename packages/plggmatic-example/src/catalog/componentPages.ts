import {
  type SoftStr,
  type Option,
  some,
  none,
} from "plgg";
import {
  type Sort,
  calendar,
  checkGroup,
  drawer,
  popover,
  sortTable,
  sortedBy,
  sortedOn,
  suggestInput,
  toggled,
  accordion,
  alert,
  avatar,
  badge,
  card,
  codeBlock,
  dataTable,
  dateInput,
  descList,
  divider,
  emptyState,
  fileInput,
  iconButton,
  itemList,
  menuButton,
  numberInput,
  pagination,
  progress,
  radioGroup,
  searchField,
  segmented,
  skeleton,
  slider,
  spinner,
  steps,
  tabs,
  tag,
  tooltip,
  btnClass,
} from "plggmatic";
import {
  el,
  text,
  attr,
  onClick,
} from "plgg-view";
import {
  type Model,
  type Msg,
  msg,
  sampleOf,
} from "./model.ts";
import { type Page } from "./page.ts";
import {
  type Node,
  h1,
  h2,
  para,
  source,
  example,
  row,
} from "./parts.ts";

/**
 * THE COMPONENT SHEETS: one page a component — what it is
 * for, the real thing to operate, and how it is written.
 */
type Sheet = Readonly<{
  id: SoftStr;
  title: SoftStr;
  group: SoftStr;
  lead: SoftStr;
  live: (model: Model) => ReadonlyArray<Node>;
  code: ReadonlyArray<SoftStr>;
  notes: ReadonlyArray<SoftStr>;
}>;
const sheet = (s: Sheet): Page => ({
  id: s.id,
  title: s.title,
  group: s.group,
  wide: false,
  body: ({ model }) => [
    h1(s.title),
    para(s.lead),
    example(...s.live(model)),
    h2("書き方"),
    source(s.code.join("\n")),
    ...(s.notes.length === 0
      ? []
      : [
          h2("使用上の注意"),
          el(
            "ul",
            [],
            s.notes.map((note: SoftStr) =>
              el("li", [], [text(note)]),
            ),
          ),
        ]),
  ],
});

const act = "コンポーネント：操作";
const input = "コンポーネント：入力";
const show = "コンポーネント：表示";
const tell = "コンポーネント：通知";

const t = (s: SoftStr): Node => text(s);
const plainButton = (
  label: SoftStr,
  on: Msg,
): Node =>
  el(
    "button",
    [
      attr("type", "button"),
      attr("class", btnClass),
      onClick<Msg>(on),
    ],
    [t(label)],
  );
/** A sample's number, or the one it starts with. */
const numberOf = (
  model: Model,
  key: SoftStr,
  initial: number,
): number =>
  [Number(sampleOf(model, key, String(initial)))]
    .filter((n: number) => Number.isFinite(n))
    .concat([initial])
    .slice(0, 1)
    .reduce((_: number, n: number) => n, initial);

const views = [
  { id: "summary", label: "概要" },
  { id: "history", label: "履歴" },
  { id: "members", label: "メンバー" },
];
const units = [
  { id: "day", label: "日" },
  { id: "week", label: "週" },
  { id: "month", label: "月" },
];

const states = [
  { id: "open", label: "営業中" },
  { id: "ready", label: "準備中" },
  { id: "closed", label: "休業" },
];
const perms = [
  { id: "read", label: "閲覧" },
  { id: "write", label: "編集" },
  { id: "invite", label: "メンバーを招待" },
  { id: "remove", label: "削除" },
];
/** A sample's list, kept as words between commas. */
const listOf = (
  model: Model,
  key: SoftStr,
  initial: SoftStr,
): ReadonlyArray<SoftStr> =>
  sampleOf(model, key, initial)
    .split(",")
    .filter((word: SoftStr) => word !== "");

type Shop = Readonly<{
  name: SoftStr;
  sales: number;
  staff: number;
  note: SoftStr;
}>;
const shops: ReadonlyArray<Shop> = [
  {
    name: "東店",
    sales: 1240000,
    staff: 9,
    note: "駅前",
  },
  {
    name: "西店",
    sales: 86000,
    staff: 12,
    note: "—",
  },
  {
    name: "南店",
    sales: 430000,
    staff: 4,
    note: "改装中",
  },
  {
    name: "北店",
    sales: 915000,
    staff: 7,
    note: "—",
  },
];
/** The sample table's order, kept as `column:direction`. */
const written = (sort: Sort): SoftStr =>
  `${sort.by}:${sort.descending ? "down" : "up"}`;
const sortOf = (model: Model): Sort => ({
  by: sampleOf(model, "sort", "name:up")
    .split(":")
    .slice(0, 1)
    .join(""),
  descending: sampleOf(
    model,
    "sort",
    "name:up",
  ).endsWith(":down"),
});

/** The sample calendar's month, kept as `year-month`. */
type Month = Readonly<{
  year: number;
  month: number;
}>;
const monthOf = (model: Model): Month =>
  sampleOf(model, "month", "2026-11")
    .split("-")
    .map((part: SoftStr) => Number(part))
    .reduce(
      (m: Month, n: number, i: number): Month =>
        i === 0
          ? { ...m, year: n }
          : { ...m, month: n },
      { year: 2026, month: 11 },
    );
/** The month so many months on, written. */
const stepped = (m: Month, by: number): SoftStr =>
  `${m.year + Math.floor((m.month - 1 + by) / 12)}-${((((m.month - 1 + by) % 12) + 12) % 12) + 1}`;
/** The picked day, when it is in the month shown. */
const dayOf = (model: Model): Option<number> =>
  sampleOf(model, "day", "2026-11-27").startsWith(
    `${stepped(monthOf(model), 0)}-`,
  )
    ? some(
        Number(
          sampleOf(model, "day", "2026-11-27")
            .split("-")
            .slice(2)
            .join(""),
        ),
      )
    : none();

export const componentPages: ReadonlyArray<Page> =
  [
    // --- 操作 ---
    sheet({
      id: "icon-button",
      title: "アイコンボタン",
      group: act,
      lead: "アイコンだけを表示するボタンです。表示領域が狭い場合や、一覧の各行に同じ操作を配置する場合に使います。",
      live: () => [
        row(
          iconButton<Msg>({
            label: "追加",
            glyph: "+",
            onPress: msg.press(),
            disabled: false,
          }),
          iconButton<Msg>({
            label: "閉じる",
            glyph: "×",
            onPress: msg.press(),
            disabled: false,
          }),
          iconButton<Msg>({
            label: "無効",
            glyph: "↻",
            onPress: msg.press(),
            disabled: true,
          }),
        ),
      ],
      code: [
        "iconButton({",
        '  label: "追加",   // 読み上げ用のラベル（必須）',
        '  glyph: "+",',
        "  onPress: add,",
        "  disabled: false,",
        "})",
      ],
      notes: [
        "スクリーンリーダーはアイコンを読み上げません。label にはボタンの操作内容を指定してください。",
      ],
    }),
    sheet({
      id: "menu",
      title: "メニュー",
      group: act,
      lead: "ボタンを押すと、その下に操作の一覧が開きます。使用頻度の低い操作をまとめるときに使います。",
      live: () => [
        menuButton<Msg>({
          label: "操作",
          items: [
            {
              label: "複製",
              onPress: msg.toast("success"),
              danger: false,
            },
            {
              label: "名前を変更",
              onPress: msg.toast("info"),
              danger: false,
            },
            {
              label: "削除",
              onPress: msg.openDialog(),
              danger: true,
            },
          ],
        }),
      ],
      code: [
        "menuButton({",
        '  label: "操作",',
        "  items: [",
        '    { label: "複製", onPress: copy, danger: false },',
        '    { label: "削除", onPress: remove, danger: true },',
        "  ],",
        "})",
      ],
      notes: [
        "ブラウザ標準の機能で開閉するため、スクリプトは不要です。",
        "取り消せない操作には danger を指定します。",
      ],
    }),
    sheet({
      id: "tabs",
      title: "タブ",
      group: act,
      lead: "同じページ内で表示内容を切り替えます。別のページを右の列に開く場合はリンクを使います。",
      live: (model) => [
        tabs<Msg>({
          label: "表示",
          items: views,
          current: sampleOf(
            model,
            "tab",
            "summary",
          ),
          onSelect: msg.setSample("tab"),
        }),
        para(
          "選択中：",
          views
            .filter(
              (v) =>
                v.id ===
                sampleOf(model, "tab", "summary"),
            )
            .map((v) => v.label)
            .join(""),
        ),
      ],
      code: [
        "tabs({",
        '  label: "表示",',
        "  items: [",
        '    { id: "summary", label: "概要" },',
        '    { id: "history", label: "履歴" },',
        "  ],",
        "  current: model.tab,",
        "  onSelect: setTab,",
        "})",
      ],
      notes: [
        "タブが表示するのは見出しだけです。アプリ側で同じ current の値を使って、見出しの下に表示する内容を切り替えます。",
      ],
    }),
    sheet({
      id: "pagination",
      title: "ページ送り",
      group: act,
      lead: "一覧を複数のページに分けます。最初と最後のページ番号に加え、現在のページ番号とその前後を表示します。",
      live: (model) => [
        pagination<Msg>({
          label: "ページ",
          page: numberOf(model, "page", 5),
          pages: 12,
          onGo: (n: number) =>
            msg.setSample("page")(String(n)),
        }),
      ],
      code: [
        "pagination({",
        '  label: "ページ",',
        "  page: model.page,",
        "  pages: 12,",
        "  onGo: goToPage,",
        "})",
      ],
      notes: [
        "最初のページでは「前のページ」が、最後のページでは「次のページ」が無効になります。",
      ],
    }),
    sheet({
      id: "steps",
      title: "ステップ",
      group: act,
      lead: "一連の手順のうち、現在どの段階にいるかを示します。完了した手順、現在の手順、これからの手順を区別できます。",
      live: (model) => [
        steps<Msg>({
          label: "申し込みの手順",
          items: [
            "入力",
            "確認",
            "支払い",
            "完了",
          ],
          current: numberOf(model, "step", 1),
        }),
        row(
          plainButton(
            "戻る",
            msg.setSample("step")(
              String(
                Math.max(
                  0,
                  numberOf(model, "step", 1) - 1,
                ),
              ),
            ),
          ),
          plainButton(
            "進む",
            msg.setSample("step")(
              String(
                Math.min(
                  3,
                  numberOf(model, "step", 1) + 1,
                ),
              ),
            ),
          ),
        ),
      ],
      code: [
        "steps({",
        '  label: "申し込みの手順",',
        '  items: ["入力", "確認", "支払い", "完了"],',
        "  current: 1, // 0 から数える",
        "})",
      ],
      notes: [],
    }),
    sheet({
      id: "accordion",
      title: "アコーディオン",
      group: act,
      lead: "見出しを選ぶと、その項目の内容を開閉できます。長い説明を項目ごとに読めるようにするときに使います。",
      live: () => [
        accordion<Msg>([
          {
            title: "送料はいくらですか",
            open: true,
            body: [t("全国一律500円です。")],
          },
          {
            title: "返品できますか",
            open: false,
            body: [
              t(
                "商品到着後14日以内であれば返品できます。",
              ),
            ],
          },
          {
            title: "領収書は発行できますか",
            open: false,
            body: [
              t(
                "注文履歴からいつでも発行できます。",
              ),
            ],
          },
        ]),
      ],
      code: [
        "accordion([",
        '  { title: "送料はいくらですか", open: true, body: [...] },',
        '  { title: "返品できますか", open: false, body: [...] },',
        "])",
      ],
      notes: [
        "ブラウザ標準の機能で開閉します。折りたたんだ内容もページ内検索の対象です。",
      ],
    }),

    sheet({
      id: "popover",
      title: "ポップオーバー",
      group: act,
      lead: "ボタンの下に小さなパネルを開きます。その場で確認したい補足説明や、簡単な設定項目を表示するときに使います。",
      live: () => [
        popover<Msg>({
          label: "料金の内訳",
          body: [
            descList<Msg>([
              {
                term: "基本料金",
                value: [t("980 円")],
              },
              {
                term: "追加席",
                value: [t("300 円 × 2")],
              },
              {
                term: "合計",
                value: [t("1,580 円")],
              },
            ]),
          ],
        }),
      ],
      code: [
        "popover({",
        '  label: "料金の内訳",',
        "  body: [descList([...])],",
        "})",
      ],
      notes: [
        "メニューと同様に、ブラウザ標準の機能で開閉するため、スクリプトは不要です。",
        "操作の選択肢にはメニューを、説明や簡単な入力欄にはポップオーバーを使います。",
      ],
    }),
    sheet({
      id: "drawer",
      title: "ドロワー",
      group: act,
      lead: "画面の端から開くパネルです。ページを開いたまま、絞り込みなどの補助的な操作ができます。",
      live: (model) => [
        plainButton(
          "絞り込みを開く",
          msg.setSample("drawer")("open"),
        ),
        ...(sampleOf(model, "drawer", "") ===
        "open"
          ? [
              drawer<Msg>({
                title: "絞り込み",
                side: "right",
                closeLabel: "閉じる",
                onClose:
                  msg.setSample("drawer")(""),
                body: [
                  checkGroup<Msg>({
                    name: "sample-drawer-state",
                    label: "状態",
                    options: states,
                    chosen: listOf(
                      model,
                      "states",
                      "open",
                    ),
                    onToggle: (
                      id: SoftStr,
                    ): Msg =>
                      msg.setSample("states")(
                        toggled(
                          listOf(
                            model,
                            "states",
                            "open",
                          ),
                          id,
                        ).join(","),
                      ),
                  }),
                ],
              }),
            ]
          : []),
      ],
      code: [
        "model.open",
        "  ? [",
        "      drawer({",
        '        title: "絞り込み",',
        '        side: "right",',
        '        closeLabel: "閉じる",',
        "        onClose: close,",
        "        body: [...],",
        "      }),",
        "    ]",
        "  : []",
      ],
      notes: [
        "開閉状態はアプリ側で管理し、開いている間だけドロワーを描画します。",
        "背景の暗い部分か閉じるボタン（×）を押すと閉じます。",
        "別のページに移動する操作には、右の列にページを開くリンクを使います。",
      ],
    }),

    // --- 入力 ---
    sheet({
      id: "radio",
      title: "ラジオボタン",
      group: input,
      lead: "複数の選択肢から1つを選びます。選択肢が少なく、すべてを一覧できるようにしたい場合に使います。",
      live: (model) => [
        radioGroup<Msg>({
          name: "sample-plan",
          label: "プラン",
          options: [
            { id: "free", label: "無料" },
            { id: "team", label: "チーム" },
            { id: "company", label: "法人" },
          ],
          value: sampleOf(model, "plan", "team"),
          onChange: msg.setSample("plan"),
        }),
      ],
      code: [
        "radioGroup({",
        '  name: "plan",',
        '  label: "プラン",',
        "  options: [",
        '    { id: "free", label: "無料" },',
        '    { id: "team", label: "チーム" },',
        "  ],",
        "  value: model.plan,",
        "  onChange: setPlan,",
        "})",
      ],
      notes: [
        "選択肢が6個以上ある場合は、セレクトボックスを使います。",
      ],
    }),
    sheet({
      id: "segmented",
      title: "切り替えボタン",
      group: input,
      lead: "横に並んだ2〜4個の選択肢から1つを選びます。表示単位など、選択をすぐに反映する設定に使います。",
      live: (model) => [
        segmented<Msg>({
          label: "単位",
          options: units,
          value: sampleOf(model, "unit", "week"),
          onSelect: msg.setSample("unit"),
        }),
      ],
      code: [
        "segmented({",
        '  label: "単位",',
        "  options: [",
        '    { id: "day", label: "日" },',
        '    { id: "week", label: "週" },',
        "  ],",
        "  value: model.unit,",
        "  onSelect: setUnit,",
        "})",
      ],
      notes: [],
    }),
    sheet({
      id: "number-input",
      title: "数値の入力欄",
      group: input,
      lead: "数値を入力する欄です。スマートフォンでは数字用のキーボードが表示されます。",
      live: (model) => [
        numberInput<Msg>({
          name: "sample-count",
          label: "個数",
          value: sampleOf(model, "count", "3"),
          error:
            Number(
              sampleOf(model, "count", "3"),
            ) > 10
              ? some("10個以内で入力してください")
              : none(),
          disabled: false,
          min: some(0),
          max: some(10),
          step: some(1),
          onInput: msg.setSample("count"),
        }),
      ],
      code: [
        "numberInput({",
        '  name: "count",',
        '  label: "個数",',
        "  value: model.count, // 入力値は文字列として保持",
        "  error: none(),",
        "  disabled: false,",
        "  min: some(0), max: some(10), step: some(1),",
        "  onInput: setCount,",
        "})",
      ],
      notes: [
        "入力値は文字列として取得できます。数値への変換はアプリ側で行います。",
      ],
    }),
    sheet({
      id: "search-field",
      title: "検索欄",
      group: input,
      lead: "一覧のすぐ上に配置し、検索語を入力して項目を絞り込みます。",
      live: (model) => [
        searchField<Msg>({
          name: "sample-q",
          label: "店舗を絞り込む",
          value: sampleOf(model, "q", ""),
          placeholder: "店舗名",
          onInput: msg.setSample("q"),
        }),
        itemList<Msg>(
          ["東店", "西店", "南店", "北店"]
            .filter((name) =>
              name.includes(
                sampleOf(model, "q", ""),
              ),
            )
            .map((name) => ({
              title: name,
              note: none(),
              trailing: [],
            })),
        ),
      ],
      code: [
        "searchField({",
        '  name: "q",',
        '  label: "店舗を絞り込む", // 読み上げ用。画面には出ません',
        "  value: model.q,",
        '  placeholder: "店舗名",',
        "  onInput: setQuery,",
        "})",
      ],
      notes: [],
    }),
    sheet({
      id: "date-input",
      title: "日付の入力欄",
      group: input,
      lead: "ブラウザ標準のカレンダーから日付を選びます。",
      live: (model) => [
        dateInput<Msg>({
          name: "sample-day",
          label: "納期",
          value: sampleOf(
            model,
            "day",
            "2026-12-01",
          ),
          error: none(),
          disabled: false,
          onInput: msg.setSample("day"),
        }),
      ],
      code: [
        "dateInput({",
        '  name: "day",',
        '  label: "納期",',
        '  value: model.day, // "2026-12-01"、または空',
        "  error: none(),",
        "  disabled: false,",
        "  onInput: setDay,",
        "})",
      ],
      notes: [],
    }),
    sheet({
      id: "slider",
      title: "スライダー",
      group: input,
      lead: "指定した範囲内で値を調整します。濃さなど、厳密な数値を入力する必要がない場合に適しています。",
      live: (model) => [
        slider<Msg>({
          name: "sample-level",
          label: "濃さ",
          value: numberOf(model, "level", 40),
          min: 0,
          max: 100,
          step: 10,
          onInput: msg.setSample("level"),
        }),
      ],
      code: [
        "slider({",
        '  name: "level",',
        '  label: "濃さ",',
        "  value: model.level,",
        "  min: 0, max: 100, step: 10,",
        "  onInput: setLevel,",
        "})",
      ],
      notes: [
        "スライダーの横には常に現在の値が数値で表示されます。",
      ],
    }),
    sheet({
      id: "file-input",
      title: "ファイルの選択",
      group: input,
      lead: "ブラウザ標準のファイル選択画面でファイルを選びます。",
      live: (model) => [
        fileInput<Msg>({
          name: "sample-file",
          label: "取り込むファイル",
          accept: some(".csv"),
          onChange: msg.setSample("file"),
        }),
        para(
          "選択したファイル：",
          sampleOf(model, "file", "未選択"),
        ),
      ],
      code: [
        "fileInput({",
        '  name: "file",',
        '  label: "取り込むファイル",',
        '  accept: some(".csv"),',
        "  onChange: picked,",
        "})",
      ],
      notes: [],
    }),

    sheet({
      id: "suggest-input",
      title: "入力候補付きの入力欄",
      group: input,
      lead: "文字を入力すると候補が表示されます。候補にない値も入力できます。",
      live: (model) => [
        suggestInput<Msg>({
          name: "sample-city",
          label: "都市",
          value: sampleOf(model, "city", ""),
          error: none(),
          disabled: false,
          options: [
            "札幌",
            "仙台",
            "東京",
            "名古屋",
            "大阪",
            "福岡",
          ],
          onInput: msg.setSample("city"),
        }),
      ],
      code: [
        "suggestInput({",
        '  name: "city",',
        '  label: "都市",',
        "  value: model.city,",
        "  error: none(),",
        "  disabled: false,",
        '  options: ["札幌", "東京", "大阪"],',
        "  onInput: setCity,",
        "})",
      ],
      notes: [
        "候補の表示にはブラウザ標準の機能を使うため、外観はブラウザによって異なります。",
        "入力値を候補の中から選ぶ場合は、セレクトボックスかラジオボタンを使います。",
      ],
    }),
    sheet({
      id: "check-group",
      title: "複数選択",
      group: input,
      lead: "すべての選択肢を一覧表示し、該当する項目をいくつでも選べるようにします。",
      live: (model) => [
        checkGroup<Msg>({
          name: "sample-perms",
          label: "権限",
          options: perms,
          chosen: listOf(model, "perms", "read"),
          onToggle: (id: SoftStr): Msg =>
            msg.setSample("perms")(
              toggled(
                listOf(model, "perms", "read"),
                id,
              ).join(","),
            ),
        }),
        para(
          `選択した項目数：${listOf(model, "perms", "read").length}個`,
        ),
      ],
      code: [
        "checkGroup({",
        '  name: "perms",',
        '  label: "権限",',
        "  options: [",
        '    { id: "read", label: "閲覧" },',
        '    { id: "write", label: "編集" },',
        "  ],",
        "  chosen: model.perms,",
        "  onToggle: (id) => setPerms(toggled(model.perms, id)),",
        "})",
      ],
      notes: [
        "選択済みの項目はアプリ側でリストとして管理します。toggled を使うと、操作した項目をリストに追加したり、リストから外したりできます。",
        "選択できる項目が1つだけの場合は、ラジオボタンを使います。",
      ],
    }),

    // --- 見せる ---
    sheet({
      id: "data-table",
      title: "表",
      group: show,
      lead: "データを行と列で表示します。数値は右揃えにします。",
      live: () => [
        dataTable<Msg>({
          caption: "店舗別の売上",
          columns: [
            { label: "店舗", numeric: false },
            { label: "状態", numeric: false },
            { label: "売上", numeric: true },
            { label: "前月比", numeric: true },
          ],
          rows: [
            [
              t("東店"),
              badge({
                label: "営業中",
                tone: some("success"),
              }),
              t("1,240,000"),
              t("+12%"),
            ],
            [
              t("西店"),
              badge({
                label: "準備中",
                tone: some("warning"),
              }),
              t("86,000"),
              t("-3%"),
            ],
            [
              t("南店"),
              badge({
                label: "休業",
                tone: none(),
              }),
              t("0"),
              t("—"),
            ],
          ],
        }),
      ],
      code: [
        "dataTable({",
        '  caption: "店舗別の売上",',
        "  columns: [",
        '    { label: "店舗", numeric: false },',
        '    { label: "売上", numeric: true },',
        "  ],",
        '  rows: [[text("東店"), text("1,240,000")]],',
        "})",
      ],
      notes: [
        "表が収まらない場合は、ページの列幅を保ったまま、表の中だけを横にスクロールできます。",
      ],
    }),
    sheet({
      id: "item-list",
      title: "一覧",
      group: show,
      lead: "各項目を同じ形式の行で表示します。行には名前とその下の補足説明を表示し、右端にはバッジなどを配置できます。",
      live: () => [
        itemList<Msg>([
          {
            title: "東店",
            note: some("東京都千代田区"),
            trailing: [
              badge({
                label: "営業中",
                tone: some("success"),
              }),
            ],
          },
          {
            title: "西店",
            note: some("大阪府大阪市"),
            trailing: [
              badge({ label: "3", tone: none() }),
            ],
          },
          {
            title: "南店",
            note: none(),
            trailing: [],
          },
        ]),
      ],
      code: [
        "itemList([",
        "  {",
        '    title: "東店",',
        '    note: some("東京都千代田区"),',
        '    trailing: [badge({ label: "営業中", tone: some("success") })],',
        "  },",
        "])",
      ],
      notes: [],
    }),
    sheet({
      id: "desc-list",
      title: "説明リスト",
      group: show,
      lead: "項目名と値を組にして縦に並べます。店舗の所在地や営業状況など、1つの対象の詳細を表示するときに使います。",
      live: () => [
        descList<Msg>([
          { term: "名前", value: [t("東店")] },
          {
            term: "所在地",
            value: [t("東京都千代田区")],
          },
          {
            term: "状態",
            value: [
              badge({
                label: "営業中",
                tone: some("success"),
              }),
            ],
          },
        ]),
      ],
      code: [
        "descList([",
        '  { term: "名前", value: [text("東店")] },',
        '  { term: "所在地", value: [text("東京都千代田区")] },',
        "])",
      ],
      notes: [],
    }),
    sheet({
      id: "card",
      title: "カード",
      group: show,
      lead: "関連する情報をまとめて表示します。上から順にタイトル、本文、操作欄を配置します。",
      live: () => [
        card<Msg>({
          title: some("東店"),
          body: [
            para(
              "今月の売上は 1,240,000 円でした。先月より 12% 増えています。",
            ),
          ],
          foot: [
            plainButton(
              "詳細を見る",
              msg.press(),
            ),
          ],
        }),
      ],
      code: [
        "card({",
        '  title: some("東店"),',
        "  body: [...],",
        "  foot: [...], // 空の場合は操作欄を表示しません",
        "})",
      ],
      notes: [
        "列自体が情報のまとまりを表します。同じ列の中でさらに内容を区切る必要がある場合に、カードを使います。",
      ],
    }),
    sheet({
      id: "badge",
      title: "バッジとタグ",
      group: show,
      lead: "バッジは状態や件数を示します。タグは項目の分類を示します。",
      live: (model) => [
        row(
          badge({ label: "12", tone: none() }),
          badge({
            label: "営業中",
            tone: some("success"),
          }),
          badge({
            label: "準備中",
            tone: some("warning"),
          }),
          badge({
            label: "停止",
            tone: some("danger"),
          }),
          badge({
            label: "新着",
            tone: some("info"),
          }),
        ),
        row(
          tag<Msg>({
            label: "食品",
            onRemove: none(),
          }),
          ...(sampleOf(model, "tag", "on") ===
          "on"
            ? [
                tag<Msg>({
                  label: "急ぎ（外せる）",
                  onRemove: some(
                    msg.setSample("tag")("off"),
                  ),
                }),
              ]
            : [
                plainButton(
                  "タグを戻す",
                  msg.setSample("tag")("on"),
                ),
              ]),
        ),
      ],
      code: [
        'badge({ label: "営業中", tone: some("success") })',
        'badge({ label: "12", tone: none() })',
        "",
        'tag({ label: "食品", onRemove: none() })',
        'tag({ label: "急ぎ", onRemove: some(remove) })',
      ],
      notes: [
        "バッジの意味が色だけに依存しないよう、必ず文字か数値を表示します。",
      ],
    }),
    sheet({
      id: "avatar",
      title: "アバター",
      group: show,
      lead: "人や店舗などを表すアイコンです。名前の先頭の1文字を表示します。",
      live: () => [
        row(
          avatar("田村"),
          avatar("Sato"),
          avatar("東店"),
        ),
      ],
      code: ['avatar("田村")'],
      notes: [
        "スクリーンリーダーは名前全体を読み上げます。",
      ],
    }),
    sheet({
      id: "divider",
      title: "区切り線",
      group: show,
      lead: "内容の区切りを示すに引く線です。",
      live: () => [
        para("上のまとまり"),
        divider(),
        para("下のまとまり"),
      ],
      code: ["divider()"],
      notes: [
        "内容を見出しで区切れる場合は見出しを使い、それが難しい場合に区切り線を使います。",
      ],
    }),
    sheet({
      id: "code-block",
      title: "コード",
      group: show,
      lead: "コードの書式を保ち、等幅フォントで表示します。長い行は枠内で横にスクロールできます。",
      live: () => [
        codeBlock(
          [
            "const total = items",
            "  .map((item) => item.price)",
            "  .reduce((a, b) => a + b, 0);",
          ].join("\n"),
        ),
      ],
      code: ["codeBlock(source)"],
      notes: [],
    }),
    sheet({
      id: "empty-state",
      title: "データがない場合",
      group: show,
      lead: "表示するデータがない場合に使います。何が未登録なのかと、次にできる操作を案内します。",
      live: () => [
        emptyState<Msg>({
          title: "店舗はまだ登録されていません",
          hint: "店舗を登録すると、ここに表示されます。",
          action: [
            plainButton(
              "店舗を登録",
              msg.press(),
            ),
          ],
        }),
      ],
      code: [
        "emptyState({",
        '  title: "店舗はまだ登録されていません",',
        '  hint: "店舗を登録すると、ここに表示されます。",',
        "  action: [...],",
        "})",
      ],
      notes: [],
    }),

    sheet({
      id: "sort-table",
      title: "並べ替え可能な表",
      group: show,
      lead: "列見出しを押すと、その列の値を基準に行を並べ替えます。もう一度押すと順序が逆になります。",
      live: (model) => [
        sortTable<Msg>({
          caption: "店舗別の売上",
          columns: [
            {
              id: "name",
              label: "店舗",
              numeric: false,
              sortable: true,
            },
            {
              id: "sales",
              label: "売上",
              numeric: true,
              sortable: true,
            },
            {
              id: "staff",
              label: "人数",
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
          rows: sortedBy(
            shops,
            (shop: Shop): SoftStr | number =>
              sortOf(model).by === "sales"
                ? shop.sales
                : sortOf(model).by === "staff"
                  ? shop.staff
                  : shop.name,
            sortOf(model).descending,
          ).map((shop: Shop) => [
            t(shop.name),
            t(shop.sales.toLocaleString("ja-JP")),
            t(String(shop.staff)),
            t(shop.note),
          ]),
          sort: sortOf(model),
          onSort: (id: SoftStr): Msg =>
            msg.setSample("sort")(
              written(
                sortedOn(sortOf(model), id),
              ),
            ),
        }),
      ],
      code: [
        "sortTable({",
        '  caption: "店舗別の売上",',
        "  columns: [",
        '    { id: "name", label: "店舗", numeric: false, sortable: true },',
        '    { id: "sales", label: "売上", numeric: true, sortable: true },',
        "  ],",
        "  rows: sortedBy(",
        "    shops,",
        "    (shop) => shop.sales,",
        "    model.sort.descending,",
        "  ).map(toCells),",
        "  sort: model.sort,",
        "  onSort: (id) => setSort(sortedOn(model.sort, id)),",
        "})",
      ],
      notes: [
        "並べ替えの基準となる列と順序はアプリ側で管理します。行を並べ替えるには sortedBy を使います。",
        "数値の列は数値順、文字列の列は文字列順に並べ替えます。",
        "並べ替えに対応した列見出しにはボタンを使います。現在の並べ替え順はスクリーンリーダーでも確認できます。",
      ],
    }),
    sheet({
      id: "calendar",
      title: "カレンダー",
      group: show,
      lead: "1か月分の日付を1日1マスで表示します。日付を押すと選択できます。",
      live: (model) => [
        calendar<Msg>({
          title: `${monthOf(model).year}年${monthOf(model).month}月`,
          year: monthOf(model).year,
          month: monthOf(model).month,
          chosen: dayOf(model),
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
          onPrevious: msg.setSample("month")(
            stepped(monthOf(model), -1),
          ),
          onNext: msg.setSample("month")(
            stepped(monthOf(model), 1),
          ),
          onPick: (day: number): Msg =>
            msg.setSample("day")(
              `${stepped(monthOf(model), 0)}-${day}`,
            ),
        }),
      ],
      code: [
        "calendar({",
        '  title: "2026年11月",',
        "  year: 2026,",
        "  month: 11,",
        "  chosen: some(27),",
        '  weekdays: ["日", "月", "火", "水", "木", "金", "土"],',
        '  previousLabel: "前の月",',
        '  nextLabel: "次の月",',
        "  onPrevious: previous,",
        "  onNext: next,",
        "  onPick: pick,",
        "})",
      ],
      notes: [
        "表示する月と選択中の日付はアプリ側で管理します。",
        "月の表示名はアプリ側で指定できるので、ページの言語に合わせて表記できます。",
        "日付を1つ入力するだけなら、日付の入力欄が適しています。",
      ],
    }),

    // --- 知らせる ---
    sheet({
      id: "alert",
      title: "アラート",
      group: tell,
      lead: "お知らせをページ内に表示します。トーストと異なり、自動では消えません。",
      live: () => [
        alert<Msg>({
          tone: "info",
          title: some("メンテナンスのお知らせ"),
          body: [
            t(
              "12月1日の深夜に、サービスを約30分間停止します。",
            ),
          ],
        }),
        alert<Msg>({
          tone: "success",
          title: none(),
          body: [t("設定を保存しました。")],
        }),
        alert<Msg>({
          tone: "warning",
          title: none(),
          body: [
            t("残りの容量が少なくなっています。"),
          ],
        }),
        alert<Msg>({
          tone: "danger",
          title: some("取り込めませんでした"),
          body: [
            t(
              "3行目の日付を読み取れませんでした。",
            ),
          ],
        }),
      ],
      code: [
        "alert({",
        '  tone: "danger", // success / warning / info',
        '  title: some("取り込めませんでした"),',
        '  body: [text("3行目の日付を読み取れませんでした。")],',
        "})",
      ],
      notes: [
        "danger の通知はスクリーンリーダーがすぐに読み上げます。その他の通知は、現在の読み上げが途切れたときに読み上げます。",
      ],
    }),
    sheet({
      id: "progress",
      title: "進捗表示",
      group: tell,
      lead: "処理の進捗を表示します。完了までの割合が分からない場合は、処理中であることを示します。",
      live: (model) => [
        progress<Msg>({
          label: "取り込み",
          share: some(
            numberOf(model, "share", 40) / 100,
          ),
        }),
        row(
          plainButton(
            "進める",
            msg.setSample("share")(
              String(
                (numberOf(model, "share", 40) +
                  20) %
                  120,
              ),
            ),
          ),
        ),
        para("進捗の割合が分からない場合"),
        progress<Msg>({
          label: "確認中",
          share: none(),
        }),
      ],
      code: [
        'progress({ label: "取り込み", share: some(0.4) })',
        'progress({ label: "確認中", share: none() })',
      ],
      notes: [],
    }),
    sheet({
      id: "loading",
      title: "読み込み中とスケルトン",
      group: tell,
      lead: "短い待ち時間にはスピナーを表示します。ページの読み込みを待つ間は、スケルトンで内容のおおまかな配置を示します。",
      live: () => [
        spinner<Msg>("読み込んでいます"),
        divider(),
        skeleton<Msg>(3),
      ],
      code: [
        'spinner("読み込んでいます")',
        "",
        "skeleton(3) // 行の数",
      ],
      notes: [
        "スクリーンリーダーはスケルトンを読み上げません。読み込み中であることは、スピナーのラベルで伝えます。",
        "OS で動きを減らす設定が有効な場合、アニメーションは再生されません。",
      ],
    }),
    sheet({
      id: "tooltip",
      title: "ツールチップ",
      group: tell,
      lead: "ポインターを合わせるか、キーボードでフォーカスを移すと、短い補足説明が表示されます。",
      live: () => [
        para(
          "合計は ",
          tooltip<Msg>({
            tip: "消費税 10% を含みます",
            children: [t("13,200 円")],
          }),
          " です。",
        ),
      ],
      code: [
        "tooltip({",
        '  tip: "消費税 10% を含みます",',
        '  children: [text("13,200 円")],',
        "})",
      ],
      notes: [
        "スマートフォンではポインターを合わせる操作ができないため、操作に必要な情報は本文に記載します。",
      ],
    }),
  ];
