import { type SoftStr, some, none } from "plgg";
import {
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
          h2("決まり"),
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
const show = "コンポーネント：見せる";
const tell = "コンポーネント：知らせる";

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

export const componentPages: ReadonlyArray<Page> =
  [
    // --- 操作 ---
    sheet({
      id: "icon-button",
      title: "アイコンボタン",
      group: act,
      lead: "絵だけのボタンです。場所が狭いところ、同じ操作が何度も並ぶところで使います。",
      live: () => [
        row(
          iconButton<Msg>({
            label: "足す",
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
            label: "押せない",
            glyph: "↻",
            onPress: msg.press(),
            disabled: true,
          }),
        ),
      ],
      code: [
        "iconButton({",
        '  label: "足す",   // 読み上げられる名前。省けません',
        '  glyph: "+",',
        "  onPress: add,",
        "  disabled: false,",
        "})",
      ],
      notes: [
        "絵は読み上げられません。名前（label）が、そのボタンのすべてです。",
      ],
    }),
    sheet({
      id: "menu",
      title: "メニュー",
      group: act,
      lead: "押すと選択肢が下に出るボタンです。たまにしか使わない操作をまとめます。",
      live: () => [
        menuButton<Msg>({
          label: "操作",
          items: [
            {
              label: "写しを作る",
              onPress: msg.toast("success"),
              danger: false,
            },
            {
              label: "名前を変える",
              onPress: msg.toast("info"),
              danger: false,
            },
            {
              label: "消す",
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
        '    { label: "写しを作る", onPress: copy, danger: false },',
        '    { label: "消す", onPress: remove, danger: true },',
        "  ],",
        "})",
      ],
      notes: [
        "ブラウザの開閉の仕組みでできています。スクリプトなしで開きます。",
        "取り消せない操作には danger を付けます。",
      ],
    }),
    sheet({
      id: "tabs",
      title: "タブ",
      group: act,
      lead: "同じ場所の中身を切り替えます。別のページへ進むものではありません（それはリンクで、右に開きます）。",
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
          "いま：",
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
        "タブが描くのは見出しの列だけです。下の中身は、同じ current で呼ぶ側が選びます。",
      ],
    }),
    sheet({
      id: "pagination",
      title: "ページ送り",
      group: act,
      lead: "長い一覧を分けて進みます。最初と最後、いまの前後だけを見せます。",
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
        "端では、戻る・進むのボタンが本当に押せなくなります。",
      ],
    }),
    sheet({
      id: "steps",
      title: "ステップ",
      group: act,
      lead: "手順のどこに居るかを示します。済んだもの、いまのもの、これからのものが分かれて見えます。",
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
      lead: "見出しごとに開閉します。全部を一度に読ませたくない、長い説明に使います。",
      live: () => [
        accordion<Msg>([
          {
            title: "送料はいくらですか",
            open: true,
            body: [t("全国一律 500 円です。")],
          },
          {
            title: "返品できますか",
            open: false,
            body: [
              t(
                "届いてから 14 日以内なら返品できます。",
              ),
            ],
          },
          {
            title: "領収書は出ますか",
            open: false,
            body: [
              t(
                "注文の履歴から、いつでも出せます。",
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
        "ブラウザの開閉の仕組みでできています。閉じた中身も、ページ内検索で見つかります。",
      ],
    }),

    // --- 入力 ---
    sheet({
      id: "radio",
      title: "ラジオボタン",
      group: input,
      lead: "並べた中から1つを選びます。選択肢が少なく、全部を見せておきたいときに使います。",
      live: (model) => [
        radioGroup<Msg>({
          name: "sample-plan",
          label: "プラン",
          options: [
            { id: "free", label: "無料" },
            { id: "team", label: "チーム" },
            { id: "company", label: "会社" },
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
        "5つを超えるなら、選択（セレクト）にします。",
      ],
    }),
    sheet({
      id: "segmented",
      title: "切り替えボタン",
      group: input,
      lead: "2〜4個から1つを、横に並べて選びます。押した瞬間に効く切り替え（表示の単位など）に使います。",
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
      lead: "数を入れます。スマホでは数字のキーボードが出ます。",
      live: (model) => [
        numberInput<Msg>({
          name: "sample-count",
          label: "個数",
          value: sampleOf(model, "count", "3"),
          error:
            Number(
              sampleOf(model, "count", "3"),
            ) > 10
              ? some("10 個までです")
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
        "  value: model.count, // 文字のまま持つ",
        "  error: none(),",
        "  disabled: false,",
        "  min: some(0), max: some(10), step: some(1),",
        "  onInput: setCount,",
        "})",
      ],
      notes: [
        "値は打ったままの文字で受け取ります。数にするのは呼ぶ側です。",
      ],
    }),
    sheet({
      id: "search-field",
      title: "検索欄",
      group: input,
      lead: "一覧を絞り込む文字を入れます。一覧のすぐ上に置きます。",
      live: (model) => [
        searchField<Msg>({
          name: "sample-q",
          label: "店を絞り込む",
          value: sampleOf(model, "q", ""),
          placeholder: "店の名前",
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
        '  label: "店を絞り込む", // 読み上げ用。画面には出ません',
        "  value: model.q,",
        '  placeholder: "店の名前",',
        "  onInput: setQuery,",
        "})",
      ],
      notes: [],
    }),
    sheet({
      id: "date-input",
      title: "日付の入力欄",
      group: input,
      lead: "日付を選びます。カレンダーはブラウザのものを使います。",
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
      lead: "範囲の中の値を選びます。正確な数より、多い・少ないの加減が大事なときに使います。",
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
      notes: ["いまの値は、必ず横に数で出ます。"],
    }),
    sheet({
      id: "file-input",
      title: "ファイルの選択",
      group: input,
      lead: "ファイルを渡します。選ぶ画面はブラウザのものを使います。",
      live: (model) => [
        fileInput<Msg>({
          name: "sample-file",
          label: "取り込むファイル",
          accept: some(".csv"),
          onChange: msg.setSample("file"),
        }),
        para(
          "選んだもの：",
          sampleOf(model, "file", "（まだ）"),
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

    // --- 見せる ---
    sheet({
      id: "data-table",
      title: "表",
      group: show,
      lead: "行と列のデータを見せます。数の列は右にそろえます。",
      live: () => [
        dataTable<Msg>({
          caption: "店ごとの売上",
          columns: [
            { label: "店", numeric: false },
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
                label: "休み",
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
        '  caption: "店ごとの売上",',
        "  columns: [",
        '    { label: "店", numeric: false },',
        '    { label: "売上", numeric: true },',
        "  ],",
        '  rows: [[text("東店"), text("1,240,000")]],',
        "})",
      ],
      notes: [
        "幅が足りないときは、表の枠の中だけが横にスクロールします。列は広がりません。",
      ],
    }),
    sheet({
      id: "item-list",
      title: "一覧",
      group: show,
      lead: "同じ形の行を並べます。名前、その下の一言、右端に付けるもの、の3つでできています。",
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
      title: "説明の並び",
      group: show,
      lead: "項目名と値の対を、縦に並べます。1つのものの詳細を見せるときに使います。",
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
      lead: "ひとまとまりの箱です。名前、中身、下に操作、の3段です。",
      live: () => [
        card<Msg>({
          title: some("東店"),
          body: [
            para(
              "今月の売上は 1,240,000 円でした。先月より 12% 増えています。",
            ),
          ],
          foot: [
            plainButton("くわしく", msg.press()),
          ],
        }),
      ],
      code: [
        "card({",
        '  title: some("東店"),',
        "  body: [...],",
        "  foot: [...], // 空なら下の段は出ません",
        "})",
      ],
      notes: [
        "列そのものが箱です。カードは、列の中でさらにまとまりを分けたいときだけ使います。",
      ],
    }),
    sheet({
      id: "badge",
      title: "バッジとタグ",
      group: show,
      lead: "バッジは状態や数の小さな印、タグは分類の札です。",
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
        "色だけで意味を伝えません。バッジには必ず言葉か数が入ります。",
      ],
    }),
    sheet({
      id: "avatar",
      title: "アバター",
      group: show,
      lead: "人や物の印です。名前の最初の1文字を出します。",
      live: () => [
        row(
          avatar("田村"),
          avatar("Sato"),
          avatar("東店"),
        ),
      ],
      code: ['avatar("田村")'],
      notes: [
        "読み上げられるのは、1文字ではなく名前の全体です。",
      ],
    }),
    sheet({
      id: "divider",
      title: "区切り線",
      group: show,
      lead: "まとまりの境目に引く線です。",
      live: () => [
        para("上のまとまり"),
        divider(),
        para("下のまとまり"),
      ],
      code: ["divider()"],
      notes: [
        "見出しで分けられるなら、見出しを使います。線は最後の手段です。",
      ],
    }),
    sheet({
      id: "code-block",
      title: "コード",
      group: show,
      lead: "書いたとおりに、等幅で見せます。長い行は枠の中で横にスクロールします。",
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
      title: "空の状態",
      group: show,
      lead: "まだ何もないときに、その場所に置きます。何がないのか、次に何をすればいいのかを言います。",
      live: () => [
        emptyState<Msg>({
          title: "店がまだありません",
          hint: "最初の店を足すと、ここに並びます。",
          action: [
            plainButton("店を足す", msg.press()),
          ],
        }),
      ],
      code: [
        "emptyState({",
        '  title: "店がまだありません",',
        '  hint: "最初の店を足すと、ここに並びます。",',
        "  action: [...],",
        "})",
      ],
      notes: [],
    }),

    // --- 知らせる ---
    sheet({
      id: "alert",
      title: "注意書き",
      group: tell,
      lead: "ページの中に置く知らせです。トーストと違って、消えずにそこに居続けます。",
      live: () => [
        alert<Msg>({
          tone: "info",
          title: some("メンテナンスのお知らせ"),
          body: [
            t(
              "12月1日の深夜、30分ほど止まります。",
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
          body: [t("3 行目の日付が読めません。")],
        }),
      ],
      code: [
        "alert({",
        '  tone: "danger", // success / warning / info',
        '  title: some("取り込めませんでした"),',
        '  body: [text("3 行目の日付が読めません。")],',
        "})",
      ],
      notes: [
        "danger はすぐに読み上げられます。ほかは、読み上げの切れ目で伝わります。",
      ],
    }),
    sheet({
      id: "progress",
      title: "進み具合",
      group: tell,
      lead: "どこまで終わったかを見せます。終わりが分からないときは、動いていることだけを見せます。",
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
        para("終わりが分からないとき："),
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
      lead: "待っていることを示します。短い待ちには回る印、ページの中身を待つときは中身の形を先に見せます。",
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
        "スケルトンは読み上げられません。待っていることは、回る印の言葉で伝えます。",
        "OS で動きを減らす設定の人には、動かしません。",
      ],
    }),
    sheet({
      id: "tooltip",
      title: "ツールチップ",
      group: tell,
      lead: "マウスを乗せるか、キーボードで合わせると出る短い説明です。",
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
        "スマホでは乗せられません。知らないと困ることは、ツールチップではなく本文に書きます。",
      ],
    }),
  ];
