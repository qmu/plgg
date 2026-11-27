import { type Label } from "./locale.ts";
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
  toolButton,
  toolGroup,
  toolbar,
  split,
  rowList,
  codeInput,
  statusLine,
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
export const componentPages = (
  label: Label,
): ReadonlyArray<Page> => {
  const sheet = (s: Sheet): Page => ({
    id: s.id,
    title: s.title,
    group: s.group,
    wide: false,
    body: ({ model }) => [
      h1(s.title),
      para(s.lead),
      example(...s.live(model)),
      h2(label("書き方", "Usage")),
      source(s.code.join("\n")),
      ...(s.notes.length === 0
        ? []
        : [
            h2(label("使用上の注意", "Notes")),
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

  const act = label(
    "コンポーネント：操作",
    "Components · Actions",
  );
  const input = label(
    "コンポーネント：入力",
    "Components · Input",
  );
  const show = label(
    "コンポーネント：表示",
    "Components · Display",
  );
  const tell = label(
    "コンポーネント：通知",
    "Components · Feedback",
  );

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
    [
      Number(
        sampleOf(model, key, String(initial)),
      ),
    ]
      .filter((n: number) => Number.isFinite(n))
      .concat([initial])
      .slice(0, 1)
      .reduce(
        (_: number, n: number) => n,
        initial,
      );

  const views = [
    {
      id: "summary",
      label: label("概要", "Summary"),
    },
    {
      id: "history",
      label: label("履歴", "History"),
    },
    {
      id: "members",
      label: label("メンバー", "Members"),
    },
  ];
  const units = [
    { id: "day", label: label("日", "Day") },
    { id: "week", label: label("週", "Week") },
    { id: "month", label: label("月", "Month") },
  ];

  const states = [
    {
      id: "open",
      label: label("営業中", "Open"),
    },
    {
      id: "ready",
      label: label("準備中", "Opening soon"),
    },
    {
      id: "closed",
      label: label("休業", "Closed"),
    },
  ];
  const perms = [
    { id: "read", label: label("閲覧", "Read") },
    { id: "write", label: label("編集", "Edit") },
    {
      id: "invite",
      label: label(
        "メンバーを招待",
        "Invite members",
      ),
    },
    {
      id: "remove",
      label: label("削除", "Delete"),
    },
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
      name: label("東店", "East branch"),
      sales: 1240000,
      staff: 9,
      note: label("駅前", "Near the station"),
    },
    {
      name: label("西店", "West branch"),
      sales: 86000,
      staff: 12,
      note: "—",
    },
    {
      name: label("南店", "South branch"),
      sales: 430000,
      staff: 4,
      note: label("改装中", "Under renovation"),
    },
    {
      name: label("北店", "North branch"),
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
        (
          m: Month,
          n: number,
          i: number,
        ): Month =>
          i === 0
            ? { ...m, year: n }
            : { ...m, month: n },
        { year: 2026, month: 11 },
      );
  /** The month so many months on, written. */
  const stepped = (
    m: Month,
    by: number,
  ): SoftStr =>
    `${m.year + Math.floor((m.month - 1 + by) / 12)}-${((((m.month - 1 + by) % 12) + 12) % 12) + 1}`;
  /** The picked day, when it is in the month shown. */
  const dayOf = (model: Model): Option<number> =>
    sampleOf(
      model,
      "day",
      "2026-11-27",
    ).startsWith(`${stepped(monthOf(model), 0)}-`)
      ? some(
          Number(
            sampleOf(model, "day", "2026-11-27")
              .split("-")
              .slice(2)
              .join(""),
          ),
        )
      : none();

  return [
    // --- 操作 ---
    sheet({
      id: "icon-button",
      title: label(
        "アイコンボタン",
        "Icon button",
      ),
      group: act,
      lead: label(
        "アイコンだけを表示するボタンです。表示領域が狭い場合や、一覧の各行に同じ操作を配置する場合に使います。",
        "Use an icon button for a repeated action in a table row or where space is tight.",
      ),
      live: () => [
        row(
          iconButton<Msg>({
            label: label("追加", "Add"),
            glyph: "+",
            onPress: msg.press(),
            disabled: false,
          }),
          iconButton<Msg>({
            label: label("閉じる", "Close"),
            glyph: "×",
            onPress: msg.press(),
            disabled: false,
          }),
          iconButton<Msg>({
            label: label("無効", "Disabled"),
            glyph: "↻",
            onPress: msg.press(),
            disabled: true,
          }),
        ),
      ],
      code: [
        "iconButton({",
        label(
          '  label: "追加",   // 読み上げ用のラベル（必須）',
          '  label: "Add",',
        ),
        '  glyph: "+",',
        "  onPress: add,",
        "  disabled: false,",
        "})",
      ],
      notes: [
        label(
          "スクリーンリーダーはアイコンを読み上げません。label にはボタンの操作内容を指定してください。",
          "Give the button an accessible label that names the action. The glyph is hidden from screen readers.",
        ),
      ],
    }),
    sheet({
      id: "menu",
      title: label("メニュー", "Action menu"),
      group: act,
      lead: label(
        "ボタンを押すと、その下に操作の一覧が開きます。使用頻度の低い操作をまとめるときに使います。",
        "Open the menu to see secondary actions for the current item.",
      ),
      live: () => [
        menuButton<Msg>({
          label: label("操作", "Actions"),
          items: [
            {
              label: label("複製", "Duplicate"),
              onPress: msg.toast("success"),
              danger: false,
            },
            {
              label: label(
                "名前を変更",
                "Rename",
              ),
              onPress: msg.toast("info"),
              danger: false,
            },
            {
              label: label("削除", "Delete"),
              onPress: msg.openDialog(),
              danger: true,
            },
          ],
        }),
      ],
      code: [
        "menuButton({",
        label(
          '  label: "操作",',
          '  label: "Actions",',
        ),
        "  items: [",
        label(
          '    { label: "複製", onPress: copy, danger: false },',
          '    { label: "Duplicate", onPress: copy, danger: false },',
        ),
        label(
          '    { label: "削除", onPress: remove, danger: true },',
          '    { label: "Delete", onPress: remove, danger: true },',
        ),
        "  ],",
        "})",
      ],
      notes: [
        label(
          "ブラウザ標準の機能で開閉するため、スクリプトは不要です。",
          "The browser opens and closes the menu through its native disclosure control.",
        ),
        label(
          "取り消せない操作には danger を指定します。",
          "Set danger on a destructive action.",
        ),
      ],
    }),
    sheet({
      id: "tabs",
      title: label("タブ", "Tabs"),
      group: act,
      lead: label(
        "同じページ内で表示内容を切り替えます。別のページを右の列に開く場合はリンクを使います。",
        "Switch between views on the same page. Use a link to open another page in a column.",
      ),
      live: (model) => [
        tabs<Msg>({
          label: label("表示", "View"),
          items: views,
          current: sampleOf(
            model,
            "tab",
            "summary",
          ),
          onSelect: msg.setSample("tab"),
        }),
        para(
          label("選択中：", "Selected: "),
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
        label(
          '  label: "表示",',
          '  label: "View",',
        ),
        "  items: [",
        label(
          '    { id: "summary", label: "概要" },',
          '    { id: "summary", label: "Summary" },',
        ),
        label(
          '    { id: "history", label: "履歴" },',
          '    { id: "history", label: "History" },',
        ),
        "  ],",
        "  current: model.tab,",
        "  onSelect: setTab,",
        "})",
      ],
      notes: [
        label(
          "タブが表示するのは見出しだけです。アプリ側で同じ current の値を使って、見出しの下に表示する内容を切り替えます。",
          "The component draws the tab labels. Use the same current value to select the content below them.",
        ),
      ],
    }),
    sheet({
      id: "pagination",
      title: label("ページ送り", "Pagination"),
      group: act,
      lead: label(
        "一覧を複数のページに分けます。最初と最後のページ番号に加え、現在のページ番号とその前後を表示します。",
        "Divide a list into pages. The control shows the first and last pages and a window around the current one.",
      ),
      live: (model) => [
        pagination<Msg>({
          previousLabel: label(
            "前のページ",
            "Previous page",
          ),
          nextLabel: label(
            "次のページ",
            "Next page",
          ),
          label: label("ページ", "Page"),
          page: numberOf(model, "page", 5),
          pages: 12,
          onGo: (n: number) =>
            msg.setSample("page")(String(n)),
        }),
      ],
      code: [
        "pagination({",
        label(
          '  label: "ページ",',
          '  label: "Page",',
        ),
        "  page: model.page,",
        "  pages: 12,",
        "  onGo: goToPage,",
        "})",
      ],
      notes: [
        label(
          "最初のページでは「前のページ」が、最後のページでは「次のページ」が無効になります。",
          "Previous is disabled on the first page and Next on the last.",
        ),
      ],
    }),
    sheet({
      id: "steps",
      title: label("ステップ", "Steps"),
      group: act,
      lead: label(
        "一連の手順のうち、現在どの段階にいるかを示します。完了した手順、現在の手順、これからの手順を区別できます。",
        "Show the reader which steps are complete, which is current and which are still ahead.",
      ),
      live: (model) => [
        steps<Msg>({
          label: label(
            "申し込みの手順",
            "Application steps",
          ),
          items: [
            label("入力", "Details"),
            label("確認", "Review"),
            label("支払い", "Payment"),
            label("完了", "Complete"),
          ],
          current: numberOf(model, "step", 1),
        }),
        row(
          plainButton(
            label("戻る", "Back"),
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
            label("進む", "Next"),
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
        label(
          '  label: "申し込みの手順",',
          '  label: "Application steps",',
        ),
        label(
          '  items: ["入力", "確認", "支払い", "完了"],',
          '  items: ["Details", "Review", "Payment", "Complete"],',
        ),
        label(
          "  current: 1, // 0 から数える",
          "  current: 1,",
        ),
        "})",
      ],
      notes: [],
    }),
    sheet({
      id: "accordion",
      title: label("アコーディオン", "Accordion"),
      group: act,
      lead: label(
        "見出しを選ぶと、その項目の内容を開閉できます。長い説明を項目ごとに読めるようにするときに使います。",
        "Select a heading to expand or collapse its contents. Each section can hold a separate answer.",
      ),
      live: () => [
        accordion<Msg>([
          {
            title: label(
              "送料はいくらですか",
              "How much is shipping?",
            ),
            open: true,
            body: [
              t(
                label(
                  "全国一律500円です。",
                  "Shipping costs ¥500 nationwide.",
                ),
              ),
            ],
          },
          {
            title: label(
              "返品できますか",
              "Can I return an order?",
            ),
            open: false,
            body: [
              t(
                label(
                  "商品到着後14日以内であれば返品できます。",
                  "You can return an order within 14 days of delivery.",
                ),
              ),
            ],
          },
          {
            title: label(
              "領収書は発行できますか",
              "Can I get a receipt?",
            ),
            open: false,
            body: [
              t(
                label(
                  "注文履歴からいつでも発行できます。",
                  "Download a receipt from your order history.",
                ),
              ),
            ],
          },
        ]),
      ],
      code: [
        "accordion([",
        label(
          '  { title: "送料はいくらですか", open: true, body: [...] },',
          '  { title: "How much is shipping?", open: true, body: [...] },',
        ),
        label(
          '  { title: "返品できますか", open: false, body: [...] },',
          '  { title: "Can I return an order?", open: false, body: [...] },',
        ),
        "])",
      ],
      notes: [
        label(
          "ブラウザ標準の機能で開閉します。折りたたんだ内容もページ内検索の対象です。",
          "Each section uses the browser’s native disclosure control.",
        ),
      ],
    }),

    sheet({
      id: "toolbar",
      title: label("ツールバー", "Toolbar"),
      group: act,
      lead: label(
        "1 つの対象に対する操作を、その上に横一列で並べます。関連する操作はグループにまとめて、つなげて表示します。",
        "Place actions above the object they affect. Group related buttons so readers can see which ones go together.",
      ),
      live: (model) => [
        toolbar<Msg>({
          label: label(
            "図の操作",
            "Diagram tools",
          ),
          items: [
            toolGroup<Msg>({
              label: label("履歴", "History"),
              items: [
                toolButton<Msg>({
                  label: label(
                    "元に戻す",
                    "Undo",
                  ),
                  glyph: some("↶"),
                  pressed: none(),
                  disabled: false,
                  onPress: msg.toast("info"),
                }),
                toolButton<Msg>({
                  label: label(
                    "やり直す",
                    "Redo",
                  ),
                  glyph: some("↷"),
                  pressed: none(),
                  disabled: true,
                  onPress: msg.toast("info"),
                }),
              ],
            }),
            toolGroup<Msg>({
              label: label("表示", "View"),
              items: views.map((view) =>
                toolButton<Msg>({
                  label: view.label,
                  glyph: none(),
                  pressed: some(
                    sampleOf(
                      model,
                      "tool-view",
                      "summary",
                    ) === view.id,
                  ),
                  disabled: false,
                  onPress: msg.setSample(
                    "tool-view",
                  )(view.id),
                }),
              ),
            }),
            toolButton<Msg>({
              label: label("整列", "Arrange"),
              glyph: none(),
              pressed: none(),
              disabled: false,
              onPress: msg.toast("success"),
            }),
          ],
        }),
      ],
      code: [
        "toolbar({",
        label(
          '  label: "図の操作",',
          '  label: "Diagram tools",',
        ),
        "  items: [",
        "    toolGroup({",
        label(
          '      label: "履歴",',
          '      label: "History",',
        ),
        "      items: [",
        label(
          '        toolButton({ label: "元に戻す", glyph: some("↶"), pressed: none(), disabled: false, onPress: undo }),',
          '        toolButton({ label: "Undo", glyph: some("↶"), pressed: none(), disabled: false, onPress: undo }),',
        ),
        label(
          '        toolButton({ label: "やり直す", glyph: some("↷"), pressed: none(), disabled: true, onPress: redo }),',
          '        toolButton({ label: "Redo", glyph: some("↷"), pressed: none(), disabled: true, onPress: redo }),',
        ),
        "      ],",
        "    }),",
        label(
          '    toolButton({ label: "整列", glyph: none(), pressed: none(), disabled: false, onPress: arrange }),',
          '    toolButton({ label: "Arrange", glyph: none(), pressed: none(), disabled: false, onPress: arrange }),',
        ),
        "  ],",
        "})",
      ],
      notes: [
        label(
          "アイコンだけのツールには、読み上げ用のラベルが必ず付きます。",
          "Give every icon-only tool a label that describes its action.",
        ),
        label(
          "オン・オフの状態を持つツールは pressed で状態を伝えます。実行するだけのツールには付けません。",
          "Pass a pressed state for a toggle and none() for a one-shot action.",
        ),
        label(
          "グループはつなげて表示し、グループどうしは同じ間隔で離します。位置で意味を持たせません。",
          "Tools in a group sit together, with space between groups.",
        ),
      ],
    }),
    sheet({
      id: "splitter",
      title: label("分割の境界", "Split view"),
      group: act,
      lead: label(
        "2つの領域と、その間の境界を表示します。ドラッグによるサイズ変更はアプリ側で実装します。",
        "Place a divider between two regions. To let readers resize them, handle the drag in your application.",
      ),
      live: () => [
        split<Msg>({
          label: label(
            "左右の幅を変える",
            "Resize panels",
          ),
          orientation: "vertical",
          first: [
            t(label("左の領域", "Left panel")),
          ],
          second: [
            t(label("右の領域", "Right panel")),
          ],
        }),
      ],
      code: [
        "split({",
        label(
          '  label: "左右の幅を変える",',
          '  label: "Resize panels",',
        ),
        label(
          '  orientation: "vertical", // 上下なら "horizontal"',
          '  orientation: "vertical", // horizontal for stacked panels',
        ),
        "  first: [...],",
        "  second: [...],",
        "})",
        "",
        label(
          "// 境界だけを置くとき",
          "// Standalone divider",
        ),
        label(
          'splitter({ label: "左右の幅を変える", orientation: "vertical" })',
          'splitter({ label: "Resize panels", orientation: "vertical" })',
        ),
      ],
      notes: [
        label(
          "この部品は、ポインターでつかむ境界そのものです。領域の大きさを変える処理は、画面側で受け持ちます。",
          "Use split for the two regions and their divider, or splitter for just the divider.",
        ),
        label(
          "何の大きさを変えるのかをラベルに書きます。読み上げでは区切りとして伝わります。",
          "Name the regions in the label. Assistive technology identifies the divider as a separator.",
        ),
        label(
          "ポインターを重ねたときとドラッグ中だけ、線が見えます。",
          "The divider line appears on hover and while dragging.",
        ),
      ],
    }),
    sheet({
      id: "popover",
      title: label("ポップオーバー", "Popover"),
      group: act,
      lead: label(
        "ボタンの下に小さなパネルを開きます。その場で確認したい補足説明や、簡単な設定項目を表示するときに使います。",
        "Open a small panel beneath a button for an explanation or a few settings.",
      ),
      live: () => [
        popover<Msg>({
          label: label(
            "料金の内訳",
            "Price breakdown",
          ),
          body: [
            descList<Msg>([
              {
                term: label(
                  "基本料金",
                  "Base fee",
                ),
                value: [
                  t(label("980 円", "¥980")),
                ],
              },
              {
                term: label(
                  "追加席",
                  "Extra seats",
                ),
                value: [
                  t(
                    label(
                      "300 円 × 2",
                      "¥300 × 2",
                    ),
                  ),
                ],
              },
              {
                term: label("合計", "Total"),
                value: [
                  t(label("1,580 円", "¥1,580")),
                ],
              },
            ]),
          ],
        }),
      ],
      code: [
        "popover({",
        label(
          '  label: "料金の内訳",',
          '  label: "Price breakdown",',
        ),
        "  body: [descList([...])],",
        "})",
      ],
      notes: [
        label(
          "メニューと同様に、ブラウザ標準の機能で開閉するため、スクリプトは不要です。",
          "The browser handles opening and closing through a native disclosure.",
        ),
        label(
          "操作の選択肢にはメニューを、説明や簡単な入力欄にはポップオーバーを使います。",
          "Use a menu for actions and a popover for details or controls.",
        ),
      ],
    }),
    sheet({
      id: "drawer",
      title: label("ドロワー", "Drawer"),
      group: act,
      lead: label(
        "画面の端から開くパネルです。ページを開いたまま、絞り込みなどの補助的な操作ができます。",
        "Open a panel at the edge of the screen to adjust filters while keeping the current page in view.",
      ),
      live: (model) => [
        plainButton(
          label("絞り込みを開く", "Open filters"),
          msg.setSample("drawer")("open"),
        ),
        ...(sampleOf(model, "drawer", "") ===
        "open"
          ? [
              drawer<Msg>({
                title: label(
                  "絞り込み",
                  "Filters",
                ),
                side: "right",
                closeLabel: label(
                  "閉じる",
                  "Close",
                ),
                onClose:
                  msg.setSample("drawer")(""),
                body: [
                  checkGroup<Msg>({
                    name: "sample-drawer-state",
                    label: label(
                      "状態",
                      "Status",
                    ),
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
        label(
          '        title: "絞り込み",',
          '        title: "Filters",',
        ),
        '        side: "right",',
        label(
          '        closeLabel: "閉じる",',
          '        closeLabel: "Close",',
        ),
        "        onClose: close,",
        "        body: [...],",
        "      }),",
        "    ]",
        "  : []",
      ],
      notes: [
        label(
          "開閉状態はアプリ側で管理し、開いている間だけドロワーを描画します。",
          "Keep the open state in your model and render the drawer while it is open.",
        ),
        label(
          "背景の暗い部分か閉じるボタン（×）を押すと閉じます。",
          "The backdrop and close button both send onClose.",
        ),
        label(
          "別のページに移動する操作には、右の列にページを開くリンクを使います。",
          "Use a column link when the destination is a separate page.",
        ),
      ],
    }),

    // --- 入力 ---
    sheet({
      id: "radio",
      title: label("ラジオボタン", "Radio group"),
      group: input,
      lead: label(
        "複数の選択肢から1つを選びます。選択肢が少なく、すべてを一覧できるようにしたい場合に使います。",
        "Offer one choice from a short list. All options remain visible.",
      ),
      live: (model) => [
        radioGroup<Msg>({
          name: "sample-plan",
          label: label("プラン", "Plan"),
          options: [
            {
              id: "free",
              label: label("無料", "Free"),
            },
            {
              id: "team",
              label: label("チーム", "Team"),
            },
            {
              id: "company",
              label: label("法人", "Business"),
            },
          ],
          value: sampleOf(model, "plan", "team"),
          onChange: msg.setSample("plan"),
        }),
      ],
      code: [
        "radioGroup({",
        '  name: "plan",',
        label(
          '  label: "プラン",',
          '  label: "Plan",',
        ),
        "  options: [",
        label(
          '    { id: "free", label: "無料" },',
          '    { id: "free", label: "Free" },',
        ),
        label(
          '    { id: "team", label: "チーム" },',
          '    { id: "team", label: "Team" },',
        ),
        "  ],",
        "  value: model.plan,",
        "  onChange: setPlan,",
        "})",
      ],
      notes: [
        label(
          "選択肢が6個以上ある場合は、セレクトボックスを使います。",
          "For a long list, a select field takes up less room.",
        ),
      ],
    }),
    sheet({
      id: "segmented",
      title: label(
        "切り替えボタン",
        "Segmented control",
      ),
      group: input,
      lead: label(
        "横に並んだ2〜4個の選択肢から1つを選びます。表示単位など、選択をすぐに反映する設定に使います。",
        "Choose one of a few adjacent options, such as the time interval shown in a chart.",
      ),
      live: (model) => [
        segmented<Msg>({
          label: label("単位", "Interval"),
          options: units,
          value: sampleOf(model, "unit", "week"),
          onSelect: msg.setSample("unit"),
        }),
      ],
      code: [
        "segmented({",
        label(
          '  label: "単位",',
          '  label: "Interval",',
        ),
        "  options: [",
        label(
          '    { id: "day", label: "日" },',
          '    { id: "day", label: "Day" },',
        ),
        label(
          '    { id: "week", label: "週" },',
          '    { id: "week", label: "Week" },',
        ),
        "  ],",
        "  value: model.unit,",
        "  onSelect: setUnit,",
        "})",
      ],
      notes: [],
    }),
    sheet({
      id: "number-input",
      title: label(
        "数値の入力欄",
        "Number field",
      ),
      group: input,
      lead: label(
        "数値を入力する欄です。スマートフォンでは数字用のキーボードが表示されます。",
        "Enter a quantity using a native numeric input.",
      ),
      live: (model) => [
        numberInput<Msg>({
          name: "sample-count",
          label: label("個数", "Quantity"),
          value: sampleOf(model, "count", "3"),
          error:
            Number(
              sampleOf(model, "count", "3"),
            ) > 10
              ? some(
                  label(
                    "10個以内で入力してください",
                    "Enter 10 or fewer.",
                  ),
                )
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
        label(
          '  label: "個数",',
          '  label: "Quantity",',
        ),
        label(
          "  value: model.count, // 入力値は文字列として保持",
          "  value: model.count,",
        ),
        "  error: none(),",
        "  disabled: false,",
        "  min: some(0), max: some(10), step: some(1),",
        "  onInput: setCount,",
        "})",
      ],
      notes: [
        label(
          "入力値は文字列として取得できます。数値への変換はアプリ側で行います。",
          "The input returns a string. Convert it to a number in your application.",
        ),
      ],
    }),
    sheet({
      id: "search-field",
      title: label("検索欄", "Search field"),
      group: input,
      lead: label(
        "一覧のすぐ上に配置し、検索語を入力して項目を絞り込みます。",
        "Place a search field above a list and use its input to filter the rows.",
      ),
      live: (model) => [
        searchField<Msg>({
          name: "sample-q",
          label: label(
            "店舗を絞り込む",
            "Filter stores",
          ),
          value: sampleOf(model, "q", ""),
          placeholder: label(
            "店舗名",
            "Store name",
          ),
          onInput: msg.setSample("q"),
        }),
        itemList<Msg>(
          [
            label("東店", "East branch"),
            label("西店", "West branch"),
            label("南店", "South branch"),
            label("北店", "North branch"),
          ]
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
        label(
          '  label: "店舗を絞り込む", // 読み上げ用。画面には出ません',
          '  label: "Filter stores",',
        ),
        "  value: model.q,",
        label(
          '  placeholder: "店舗名",',
          '  placeholder: "Store name",',
        ),
        "  onInput: setQuery,",
        "})",
      ],
      notes: [],
    }),
    sheet({
      id: "date-input",
      title: label("日付の入力欄", "Date field"),
      group: input,
      lead: label(
        "ブラウザ標準のカレンダーから日付を選びます。",
        "Choose a date with the browser’s native date control.",
      ),
      live: (model) => [
        dateInput<Msg>({
          name: "sample-day",
          label: label("納期", "Due date"),
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
        label(
          '  label: "納期",',
          '  label: "Due date",',
        ),
        label(
          '  value: model.day, // "2026-12-01"、または空',
          "  value: model.day,",
        ),
        "  error: none(),",
        "  disabled: false,",
        "  onInput: setDay,",
        "})",
      ],
      notes: [],
    }),
    sheet({
      id: "slider",
      title: label("スライダー", "Slider"),
      group: input,
      lead: label(
        "指定した範囲内で値を調整します。濃さなど、厳密な数値を入力する必要がない場合に適しています。",
        "Adjust a value within a range. A slider suits settings such as opacity where the exact value is less important.",
      ),
      live: (model) => [
        slider<Msg>({
          name: "sample-level",
          label: label("濃さ", "Opacity"),
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
        label(
          '  label: "濃さ",',
          '  label: "Opacity",',
        ),
        "  value: model.level,",
        "  min: 0, max: 100, step: 10,",
        "  onInput: setLevel,",
        "})",
      ],
      notes: [
        label(
          "スライダーの横には常に現在の値が数値で表示されます。",
          "The current numeric value appears beside the slider.",
        ),
      ],
    }),
    sheet({
      id: "file-input",
      title: label(
        "ファイルの選択",
        "File picker",
      ),
      group: input,
      lead: label(
        "ブラウザ標準のファイル選択画面でファイルを選びます。",
        "Choose a local file in the browser’s file chooser.",
      ),
      live: (model) => [
        fileInput<Msg>({
          name: "sample-file",
          label: label(
            "取り込むファイル",
            "File to import",
          ),
          accept: some(".csv"),
          onChange: msg.setSample("file"),
        }),
        para(
          label(
            "選択したファイル：",
            "Selected file: ",
          ),
          sampleOf(
            model,
            "file",
            label("未選択", "None"),
          ),
        ),
      ],
      code: [
        "fileInput({",
        '  name: "file",',
        label(
          '  label: "取り込むファイル",',
          '  label: "File to import",',
        ),
        '  accept: some(".csv"),',
        "  onChange: picked,",
        "})",
      ],
      notes: [],
    }),

    sheet({
      id: "code-input",
      title: label("コード入力欄", "Code input"),
      group: input,
      lead: label(
        "ソースコードを入力する欄です。等幅で表示し、折り返しとスペルチェックは行いません。",
        "Edit source in a monospaced text area with wrapping and spell checking turned off.",
      ),
      live: (model) => [
        codeInput<Msg>({
          name: "sample-code",
          label: label(
            "図の DSL",
            "Diagram source",
          ),
          value: sampleOf(
            model,
            "code",
            label(
              "node 受付\nnode 審査\n受付 -> 審査",
              "node Intake\nnode Review\nIntake -> Review",
            ),
          ),
          onInput: msg.setSample("code"),
        }),
      ],
      code: [
        "codeInput({",
        '  name: "dsl",',
        label(
          '  label: "図の DSL",',
          '  label: "Diagram source",',
        ),
        "  value: model.source,",
        "  onInput: setSource,",
        "})",
      ],
      notes: [
        label(
          "ラベルは表示せず、読み上げ用に持ちます。何の欄かは、置かれたパネルの見出しで示します。",
          "Supply a label for screen readers and use the panel heading to identify the field visually.",
        ),
        label(
          "高さは置かれた場所に合わせます。欄そのものは大きさを変えられません。",
          "The field takes its height from the containing panel.",
        ),
      ],
    }),
    sheet({
      id: "suggest-input",
      title: label(
        "入力候補付きの入力欄",
        "Input with suggestions",
      ),
      group: input,
      lead: label(
        "文字を入力すると候補が表示されます。候補にない値も入力できます。",
        "Type to see suggestions. You can also enter a value outside the list.",
      ),
      live: (model) => [
        suggestInput<Msg>({
          name: "sample-city",
          label: label("都市", "City"),
          value: sampleOf(model, "city", ""),
          error: none(),
          disabled: false,
          options: [
            label("札幌", "Sapporo"),
            label("仙台", "Sendai"),
            label("東京", "Tokyo"),
            label("名古屋", "Nagoya"),
            label("大阪", "Osaka"),
            label("福岡", "Fukuoka"),
          ],
          onInput: msg.setSample("city"),
        }),
      ],
      code: [
        "suggestInput({",
        '  name: "city",',
        label(
          '  label: "都市",',
          '  label: "City",',
        ),
        "  value: model.city,",
        "  error: none(),",
        "  disabled: false,",
        label(
          '  options: ["札幌", "東京", "大阪"],',
          '  options: ["Sapporo", "Tokyo", "Osaka"],',
        ),
        "  onInput: setCity,",
        "})",
      ],
      notes: [
        label(
          "候補の表示にはブラウザ標準の機能を使うため、外観はブラウザによって異なります。",
          "The browser renders the suggestion list, so its appearance varies.",
        ),
        label(
          "入力値を候補の中から選ぶ場合は、セレクトボックスかラジオボタンを使います。",
          "Use a select field or radio group to restrict input to listed values.",
        ),
      ],
    }),
    sheet({
      id: "check-group",
      title: label("複数選択", "Checkbox group"),
      group: input,
      lead: label(
        "すべての選択肢を一覧表示し、該当する項目をいくつでも選べるようにします。",
        "Show all options and let readers select any combination.",
      ),
      live: (model) => [
        checkGroup<Msg>({
          name: "sample-perms",
          label: label("権限", "Permissions"),
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
          label(
            `選択した項目数：${listOf(model, "perms", "read").length}個`,
            `Selected: ${listOf(model, "perms", "read").length}`,
          ),
        ),
      ],
      code: [
        "checkGroup({",
        '  name: "perms",',
        label(
          '  label: "権限",',
          '  label: "Permissions",',
        ),
        "  options: [",
        label(
          '    { id: "read", label: "閲覧" },',
          '    { id: "read", label: "Read" },',
        ),
        label(
          '    { id: "write", label: "編集" },',
          '    { id: "write", label: "Edit" },',
        ),
        "  ],",
        "  chosen: model.perms,",
        "  onToggle: (id) => setPerms(toggled(model.perms, id)),",
        "})",
      ],
      notes: [
        label(
          "選択済みの項目はアプリ側でリストとして管理します。toggled を使うと、操作した項目をリストに追加したり、リストから外したりできます。",
          "Store selected IDs in your model. toggled adds the chosen ID or removes it if already present.",
        ),
        label(
          "選択できる項目が1つだけの場合は、ラジオボタンを使います。",
          "Use a radio group when only one choice is allowed.",
        ),
      ],
    }),

    // --- 見せる ---
    sheet({
      id: "data-table",
      title: label("表", "Data table"),
      group: show,
      lead: label(
        "データを行と列で表示します。数値は右揃えにします。",
        "Arrange records in rows and columns. Mark numeric columns to align their values on the right.",
      ),
      live: () => [
        dataTable<Msg>({
          caption: label(
            "店舗別の売上",
            "Sales by store",
          ),
          columns: [
            {
              label: label("店舗", "Store"),
              numeric: false,
            },
            {
              label: label("状態", "Status"),
              numeric: false,
            },
            {
              label: label("売上", "Sales"),
              numeric: true,
            },
            {
              label: label(
                "前月比",
                "Monthly change",
              ),
              numeric: true,
            },
          ],
          rows: [
            [
              t(label("東店", "East branch")),
              badge({
                label: label("営業中", "Open"),
                tone: some("success"),
              }),
              t("1,240,000"),
              t("+12%"),
            ],
            [
              t(label("西店", "West branch")),
              badge({
                label: label(
                  "準備中",
                  "Opening soon",
                ),
                tone: some("warning"),
              }),
              t("86,000"),
              t("-3%"),
            ],
            [
              t(label("南店", "South branch")),
              badge({
                label: label("休業", "Closed"),
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
        label(
          '  caption: "店舗別の売上",',
          '  caption: "Sales by store",',
        ),
        "  columns: [",
        label(
          '    { label: "店舗", numeric: false },',
          '    { label: "Store", numeric: false },',
        ),
        label(
          '    { label: "売上", numeric: true },',
          '    { label: "Sales", numeric: true },',
        ),
        "  ],",
        label(
          '  rows: [[text("東店"), text("1,240,000")]],',
          '  rows: [[text("East branch"), text("1,240,000")]],',
        ),
        "})",
      ],
      notes: [
        label(
          "表が収まらない場合は、ページの列幅を保ったまま、表の中だけを横にスクロールできます。",
          "A wide table scrolls horizontally within its column.",
        ),
      ],
    }),
    sheet({
      id: "item-list",
      title: label("一覧", "Item list"),
      group: show,
      lead: label(
        "各項目を同じ形式の行で表示します。行には名前とその下の補足説明を表示し、右端にはバッジなどを配置できます。",
        "Give each item a title and an optional note. The trailing slot can hold a badge or another small element.",
      ),
      live: () => [
        itemList<Msg>([
          {
            title: label("東店", "East branch"),
            note: some(
              label(
                "東京都千代田区",
                "Chiyoda, Tokyo",
              ),
            ),
            trailing: [
              badge({
                label: label("営業中", "Open"),
                tone: some("success"),
              }),
            ],
          },
          {
            title: label("西店", "West branch"),
            note: some(
              label("大阪府大阪市", "Osaka"),
            ),
            trailing: [
              badge({ label: "3", tone: none() }),
            ],
          },
          {
            title: label("南店", "South branch"),
            note: none(),
            trailing: [],
          },
        ]),
      ],
      code: [
        "itemList([",
        "  {",
        label(
          '    title: "東店",',
          '    title: "East branch",',
        ),
        label(
          '    note: some("東京都千代田区"),',
          '    note: some("Chiyoda, Tokyo"),',
        ),
        label(
          '    trailing: [badge({ label: "営業中", tone: some("success") })],',
          '    trailing: [badge({ label: "Open", tone: some("success") })],',
        ),
        "  },",
        "])",
      ],
      notes: [],
    }),
    sheet({
      id: "desc-list",
      title: label(
        "説明リスト",
        "Description list",
      ),
      group: show,
      lead: label(
        "項目名と値を組にして縦に並べます。店舗の所在地や営業状況など、1つの対象の詳細を表示するときに使います。",
        "Pair each term with its value to show details about one record, such as a store’s address and opening status.",
      ),
      live: () => [
        descList<Msg>([
          {
            term: label("名前", "Name"),
            value: [
              t(label("東店", "East branch")),
            ],
          },
          {
            term: label("所在地", "Location"),
            value: [
              t(
                label(
                  "東京都千代田区",
                  "Chiyoda, Tokyo",
                ),
              ),
            ],
          },
          {
            term: label("状態", "Status"),
            value: [
              badge({
                label: label("営業中", "Open"),
                tone: some("success"),
              }),
            ],
          },
        ]),
      ],
      code: [
        "descList([",
        label(
          '  { term: "名前", value: [text("東店")] },',
          '  { term: "Name", value: [text("East branch")] },',
        ),
        label(
          '  { term: "所在地", value: [text("東京都千代田区")] },',
          '  { term: "Location", value: [text("Chiyoda, Tokyo")] },',
        ),
        "])",
      ],
      notes: [],
    }),
    sheet({
      id: "card",
      title: label("カード", "Card"),
      group: show,
      lead: label(
        "関連する情報をまとめて表示します。上から順にタイトル、本文、操作欄を配置します。",
        "Group related information under a title and place actions in the footer.",
      ),
      live: () => [
        card<Msg>({
          title: some(
            label("東店", "East branch"),
          ),
          body: [
            para(
              label(
                "今月の売上は 1,240,000 円でした。先月より 12% 増えています。",
                "Sales reached ¥1,240,000 this month, up 12% from last month.",
              ),
            ),
          ],
          foot: [
            plainButton(
              label("詳細を見る", "View details"),
              msg.press(),
            ),
          ],
        }),
      ],
      code: [
        "card({",
        label(
          '  title: some("東店"),',
          '  title: some("East branch"),',
        ),
        "  body: [...],",
        label(
          "  foot: [...], // 空の場合は操作欄を表示しません",
          "  foot: [...],",
        ),
        "})",
      ],
      notes: [
        label(
          "列自体が情報のまとまりを表します。同じ列の中でさらに内容を区切る必要がある場合に、カードを使います。",
          "A column already groups its contents. Use a card when a smaller group needs its own boundary.",
        ),
      ],
    }),
    sheet({
      id: "badge",
      title: label(
        "バッジとタグ",
        "Badges and tags",
      ),
      group: show,
      lead: label(
        "バッジは状態や件数を示します。タグは項目の分類を示します。",
        "Use a badge for a status or count and a tag for a category.",
      ),
      live: (model) => [
        row(
          badge({ label: "12", tone: none() }),
          badge({
            label: label("営業中", "Open"),
            tone: some("success"),
          }),
          badge({
            label: label(
              "準備中",
              "Opening soon",
            ),
            tone: some("warning"),
          }),
          badge({
            label: label("停止", "Suspended"),
            tone: some("danger"),
          }),
          badge({
            label: label("新着", "New"),
            tone: some("info"),
          }),
        ),
        row(
          tag<Msg>({
            label: label("食品", "Food"),
            onRemove: none(),
          }),
          ...(sampleOf(model, "tag", "on") ===
          "on"
            ? [
                tag<Msg>({
                  label: label(
                    "急ぎ（外せる）",
                    "Urgent (removable)",
                  ),
                  removeLabel: label(
                    "急ぎのタグを外す",
                    "Remove urgent tag",
                  ),
                  onRemove: some(
                    msg.setSample("tag")("off"),
                  ),
                }),
              ]
            : [
                plainButton(
                  label(
                    "タグを戻す",
                    "Restore tag",
                  ),
                  msg.setSample("tag")("on"),
                ),
              ]),
        ),
      ],
      code: [
        label(
          'badge({ label: "営業中", tone: some("success") })',
          'badge({ label: "Open", tone: some("success") })',
        ),
        'badge({ label: "12", tone: none() })',
        "",
        label(
          'tag({ label: "食品", onRemove: none() })',
          'tag({ label: "Food", onRemove: none() })',
        ),
        label(
          'tag({ label: "急ぎ", onRemove: some(remove) })',
          'tag({ label: "Urgent", onRemove: some(remove) })',
        ),
      ],
      notes: [
        label(
          "バッジの意味が色だけに依存しないよう、必ず文字か数値を表示します。",
          "Include text or a number so the badge makes sense without its color.",
        ),
      ],
    }),
    sheet({
      id: "avatar",
      title: label("アバター", "Avatar"),
      group: show,
      lead: label(
        "人や店舗などを表すアイコンです。名前の先頭の1文字を表示します。",
        "Identify a person or store by the first character of its name.",
      ),
      live: () => [
        row(
          avatar(label("田村", "Tamura")),
          avatar("Sato"),
          avatar(label("東店", "East branch")),
        ),
      ],
      code: [
        label(
          'avatar("田村")',
          'avatar("Tamura")',
        ),
      ],
      notes: [
        label(
          "スクリーンリーダーは名前全体を読み上げます。",
          "Screen readers receive the full name.",
        ),
      ],
    }),
    sheet({
      id: "divider",
      title: label("区切り線", "Divider"),
      group: show,
      lead: label(
        "内容のまとまりを区切る線です。",
        "Draw a line between two groups of content.",
      ),
      live: () => [
        para(
          label("上のまとまり", "First group"),
        ),
        divider(),
        para(
          label("下のまとまり", "Second group"),
        ),
      ],
      code: ["divider()"],
      notes: [
        label(
          "内容を見出しで区切れる場合は見出しを使い、それが難しい場合に区切り線を使います。",
          "Use a heading if the group has a name. A divider can mark a break between unnamed groups.",
        ),
      ],
    }),
    sheet({
      id: "code-block",
      title: label("コード", "Code block"),
      group: show,
      lead: label(
        "コードの書式を保ち、等幅フォントで表示します。長い行は枠内で横にスクロールできます。",
        "Preserve whitespace and show code in a monospaced font. Long lines scroll inside the block.",
      ),
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
      title: label(
        "データがない場合",
        "Empty state",
      ),
      group: show,
      lead: label(
        "表示するデータがない場合に使います。何が未登録なのかと、次にできる操作を案内します。",
        "Explain why a list is empty and offer the next action.",
      ),
      live: () => [
        emptyState<Msg>({
          title: label(
            "店舗はまだ登録されていません",
            "No stores yet",
          ),
          hint: label(
            "店舗を登録すると、ここに表示されます。",
            "Add a store to see it here.",
          ),
          action: [
            plainButton(
              label("店舗を登録", "Add a store"),
              msg.press(),
            ),
          ],
        }),
      ],
      code: [
        "emptyState({",
        label(
          '  title: "店舗はまだ登録されていません",',
          '  title: "No stores yet",',
        ),
        label(
          '  hint: "店舗を登録すると、ここに表示されます。",',
          '  hint: "Add a store to see it here.",',
        ),
        "  action: [...],",
        "})",
      ],
      notes: [],
    }),

    sheet({
      id: "row-list",
      title: label("行のリスト", "Row list"),
      group: show,
      lead: label(
        "ソースコードやログのような行の並びから、1 行を選びます。",
        "Select a single line from a sequence such as source code or a log.",
      ),
      live: (model) => [
        rowList<Msg>({
          label: label(
            "図のソース",
            "Diagram source",
          ),
          rows: [
            {
              id: "1",
              text: label(
                "node 受付",
                "node Intake",
              ),
              invalid: false,
            },
            {
              id: "2",
              text: label(
                "node 審査",
                "node Review",
              ),
              invalid: false,
            },
            {
              id: "3",
              text: label(
                "受付 -> 審査",
                "Intake -> Review",
              ),
              invalid: false,
            },
            {
              id: "4",
              text: label(
                "審査 -> ",
                "Review -> ",
              ),
              invalid: true,
            },
          ],
          selected: some(
            sampleOf(model, "row", "2"),
          ),
          onSelect: msg.setSample("row"),
        }),
        statusLine<Msg>(
          sampleOf(model, "row", "2") === "4"
            ? {
                text: label(
                  "4 行目：接続先がありません",
                  "Line 4 is missing a destination.",
                ),
                tone: some("danger"),
              }
            : {
                text: label(
                  `${sampleOf(model, "row", "2")} 行目を選択中`,
                  `Line ${sampleOf(model, "row", "2")} selected`,
                ),
                tone: none(),
              },
        ),
      ],
      code: [
        "rowList({",
        label(
          '  label: "図のソース",',
          '  label: "Diagram source",',
        ),
        "  rows: [",
        label(
          '    { id: "1", text: "node 受付", invalid: false },',
          '    { id: "1", text: "node Intake", invalid: false },',
        ),
        label(
          '    { id: "4", text: "審査 -> ", invalid: true },',
          '    { id: "4", text: "Review -> ", invalid: true },',
        ),
        "  ],",
        "  selected: some(model.row),",
        "  onSelect: selectRow,",
        "})",
        "",
        label(
          'statusLine({ text: "4 行目：接続先がありません", tone: some("danger") })',
          'statusLine({ text: "Line 4 is missing a destination.", tone: some("danger") })',
        ),
      ],
      notes: [
        label(
          "選択中の行は、ホバーより濃い背景で示します。誤りのある行には波線が付きます。",
          "The selected row has a stronger background than a hovered row. Invalid rows have a wavy underline.",
        ),
        label(
          "ステータス行は、画面の状態を 1 行で伝えます。内容が変わると読み上げられます。",
          "Use a status line for a short update. Assistive technology can announce changes.",
        ),
      ],
    }),
    sheet({
      id: "sort-table",
      title: label(
        "並べ替え可能な表",
        "Sortable table",
      ),
      group: show,
      lead: label(
        "列見出しを押すと、その列の値を基準に行を並べ替えます。もう一度押すと順序が逆になります。",
        "Select a column heading to sort by its values. Select it again to reverse the order.",
      ),
      live: (model) => [
        sortTable<Msg>({
          caption: label(
            "店舗別の売上",
            "Sales by store",
          ),
          columns: [
            {
              id: "name",
              label: label("店舗", "Store"),
              numeric: false,
              sortable: true,
            },
            {
              id: "sales",
              label: label("売上", "Sales"),
              numeric: true,
              sortable: true,
            },
            {
              id: "staff",
              label: label("人数", "Staff"),
              numeric: true,
              sortable: true,
            },
            {
              id: "note",
              label: label("備考", "Notes"),
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
        label(
          '  caption: "店舗別の売上",',
          '  caption: "Sales by store",',
        ),
        "  columns: [",
        label(
          '    { id: "name", label: "店舗", numeric: false, sortable: true },',
          '    { id: "name", label: "Store", numeric: false, sortable: true },',
        ),
        label(
          '    { id: "sales", label: "売上", numeric: true, sortable: true },',
          '    { id: "sales", label: "Sales", numeric: true, sortable: true },',
        ),
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
        label(
          "並べ替えの基準となる列と順序はアプリ側で管理します。行を並べ替えるには sortedBy を使います。",
          "Keep the sort key and direction in your model. Use sortedBy to order the rows.",
        ),
        label(
          "数値の列は数値順、文字列の列は文字列順に並べ替えます。",
          "Numeric values sort numerically and strings sort lexically.",
        ),
        label(
          "並べ替えに対応した列見出しにはボタンを使います。現在の並べ替え順はスクリーンリーダーでも確認できます。",
          "Sortable headings contain buttons and expose the active sort direction to screen readers.",
        ),
      ],
    }),
    sheet({
      id: "calendar",
      title: label("カレンダー", "Calendar"),
      group: show,
      lead: label(
        "1か月分の日付を1日1マスで表示します。日付を押すと選択できます。",
        "Show one month at a time and select a day.",
      ),
      live: (model) => [
        calendar<Msg>({
          title: label(
            `${monthOf(model).year}年${monthOf(model).month}月`,
            `${monthOf(model).year}-${String(monthOf(model).month).padStart(2, "0")}`,
          ),
          year: monthOf(model).year,
          month: monthOf(model).month,
          chosen: dayOf(model),
          weekdays: [
            label("日", "Sun"),
            label("月", "Mon"),
            label("火", "Tue"),
            label("水", "Wed"),
            label("木", "Thu"),
            label("金", "Fri"),
            label("土", "Sat"),
          ],
          previousLabel: label(
            "前の月",
            "Previous month",
          ),
          nextLabel: label(
            "次の月",
            "Next month",
          ),
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
        label(
          '  title: "2026年11月",',
          '  title: "November 2026",',
        ),
        "  year: 2026,",
        "  month: 11,",
        "  chosen: some(27),",
        label(
          '  weekdays: ["日", "月", "火", "水", "木", "金", "土"],',
          '  weekdays: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],',
        ),
        label(
          '  previousLabel: "前の月",',
          '  previousLabel: "Previous month",',
        ),
        label(
          '  nextLabel: "次の月",',
          '  nextLabel: "Next month",',
        ),
        "  onPrevious: previous,",
        "  onNext: next,",
        "  onPick: pick,",
        "})",
      ],
      notes: [
        label(
          "表示する月と選択中の日付はアプリ側で管理します。",
          "Keep the visible month and selected date in your model.",
        ),
        label(
          "月の表示名はアプリ側で指定できるので、ページの言語に合わせて表記できます。",
          "Supply the month title and weekday labels in the reader’s language.",
        ),
        label(
          "日付を1つ入力するだけなら、日付の入力欄が適しています。",
          "Use a native date field for a form that only needs a single date.",
        ),
      ],
    }),

    // --- 知らせる ---
    sheet({
      id: "alert",
      title: label("アラート", "Alert"),
      group: tell,
      lead: label(
        "お知らせをページ内に表示します。トーストと異なり、自動では消えません。",
        "Keep a notice in the page for as long as its message applies.",
      ),
      live: () => [
        alert<Msg>({
          tone: "info",
          title: some(
            label(
              "メンテナンスのお知らせ",
              "Scheduled maintenance",
            ),
          ),
          body: [
            t(
              label(
                "12月1日の深夜に、サービスを約30分間停止します。",
                "Service will pause for about 30 minutes at midnight on December 1.",
              ),
            ),
          ],
        }),
        alert<Msg>({
          tone: "success",
          title: none(),
          body: [
            t(
              label(
                "設定を保存しました。",
                "Settings saved.",
              ),
            ),
          ],
        }),
        alert<Msg>({
          tone: "warning",
          title: none(),
          body: [
            t(
              label(
                "残りの容量が少なくなっています。",
                "Storage is running low.",
              ),
            ),
          ],
        }),
        alert<Msg>({
          tone: "danger",
          title: some(
            label(
              "取り込めませんでした",
              "Import failed",
            ),
          ),
          body: [
            t(
              label(
                "3行目の日付を読み取れませんでした。",
                "The date on line 3 could not be read.",
              ),
            ),
          ],
        }),
      ],
      code: [
        "alert({",
        '  tone: "danger", // success / warning / info',
        label(
          '  title: some("取り込めませんでした"),',
          '  title: some("Import failed"),',
        ),
        label(
          '  body: [text("3行目の日付を読み取れませんでした。")],',
          '  body: [text("The date on line 3 could not be read.")],',
        ),
        "})",
      ],
      notes: [
        label(
          "danger の通知はスクリーンリーダーがすぐに読み上げます。その他の通知は、現在の読み上げが途切れたときに読み上げます。",
          "A danger alert requests an immediate announcement. Other tones wait for a pause in the screen reader’s output.",
        ),
      ],
    }),
    sheet({
      id: "progress",
      title: label("進捗表示", "Progress"),
      group: tell,
      lead: label(
        "処理の進捗を表示します。完了までの割合が分からない場合は、処理中であることを示します。",
        "Show the fraction of work completed, or an indeterminate indicator while the total is unknown.",
      ),
      live: (model) => [
        progress<Msg>({
          label: label("取り込み", "Import"),
          share: some(
            numberOf(model, "share", 40) / 100,
          ),
        }),
        row(
          plainButton(
            label("進める", "Advance"),
            msg.setSample("share")(
              String(
                (numberOf(model, "share", 40) +
                  20) %
                  120,
              ),
            ),
          ),
        ),
        para(
          label(
            "進捗の割合が分からない場合",
            "When the total is unknown",
          ),
        ),
        progress<Msg>({
          label: label("確認中", "Checking"),
          share: none(),
        }),
      ],
      code: [
        label(
          'progress({ label: "取り込み", share: some(0.4) })',
          'progress({ label: "Import", share: some(0.4) })',
        ),
        label(
          'progress({ label: "確認中", share: none() })',
          'progress({ label: "Checking", share: none() })',
        ),
      ],
      notes: [],
    }),
    sheet({
      id: "loading",
      title: label(
        "読み込み中とスケルトン",
        "Loading indicators",
      ),
      group: tell,
      lead: label(
        "短い待ち時間にはスピナーを表示します。ページの読み込みを待つ間は、スケルトンで内容のおおまかな配置を示します。",
        "Show a spinner for a short wait or a skeleton to preview the shape of content being loaded.",
      ),
      live: () => [
        spinner<Msg>(
          label("読み込んでいます", "Loading"),
        ),
        divider(),
        skeleton<Msg>(3),
      ],
      code: [
        label(
          'spinner("読み込んでいます")',
          'spinner("Loading")',
        ),
        "",
        label(
          "skeleton(3) // 行の数",
          "skeleton(3)",
        ),
      ],
      notes: [
        label(
          "スクリーンリーダーはスケルトンを読み上げません。読み込み中であることは、スピナーのラベルで伝えます。",
          "The skeleton is hidden from screen readers. Give the spinner a label to announce the wait.",
        ),
        label(
          "OS で動きを減らす設定が有効な場合、アニメーションは再生されません。",
          "The animation respects reduced-motion preferences.",
        ),
      ],
    }),
    sheet({
      id: "tooltip",
      title: label("ツールチップ", "Tooltip"),
      group: tell,
      lead: label(
        "ポインターを合わせるか、キーボードでフォーカスを移すと、短い補足説明が表示されます。",
        "Hover over the amount or focus it with the keyboard to read the short explanation.",
      ),
      live: () => [
        para(
          label("合計は ", "The total is "),
          tooltip<Msg>({
            tip: label(
              "消費税 10% を含みます",
              "Includes 10% sales tax",
            ),
            children: [
              t(label("13,200 円", "¥13,200")),
            ],
          }),
          label(" です。", "."),
        ),
      ],
      code: [
        "tooltip({",
        label(
          '  tip: "消費税 10% を含みます",',
          '  tip: "Includes 10% sales tax",',
        ),
        label(
          '  children: [text("13,200 円")],',
          '  children: [text("¥13,200")],',
        ),
        "})",
      ],
      notes: [
        label(
          "スマートフォンではポインターを合わせる操作ができないため、操作に必要な情報は本文に記載します。",
          "Put essential instructions in the page so they are available on touch screens too.",
        ),
      ],
    }),
  ];
};
