import { type Label } from "./locale.ts";
import { type SoftStr } from "plgg";
import { type Page } from "./page.ts";
import {
  type Ctx,
  type Node,
  h1,
  h2,
  para,
  table,
} from "./parts.ts";

/**
 * One basic component a UI framework is expected to
 * carry, and the page that shows it here — or none, when
 * plggmatic does not have it yet. The list is the honest
 * measure of the catalog: a missing page reads as missing.
 */
type Entry = Readonly<{
  name: SoftStr;
  what: SoftStr;
  page: SoftStr;
}>;
const have = (
  name: SoftStr,
  what: SoftStr,
  page: SoftStr,
): Entry => ({ name, what, page });

type Family = Readonly<{
  title: SoftStr;
  entries: ReadonlyArray<Entry>;
}>;

export const componentIndex = (
  label: Label,
): Page => {
  const families: ReadonlyArray<Family> = [
    {
      title: label("操作", "Actions"),
      entries: [
        have(
          label("ボタン", "Button"),
          label(
            "操作を実行する",
            "Trigger an action",
          ),
          "buttons",
        ),
        have(
          label("リンク", "Link"),
          label(
            "別のページを開く",
            "Open another page",
          ),
          "links",
        ),
        have(
          label("パンくずリスト", "Breadcrumbs"),
          label(
            "現在のページの階層を示す",
            "Show the path to the current item",
          ),
          "links",
        ),
        have(
          label(
            "テーマ切り替え",
            "Appearance toggle",
          ),
          label(
            "ライトテーマとダークテーマを切り替える",
            "Switch between light and dark colors",
          ),
          "theme",
        ),
        have(
          label("アイコンボタン", "Icon button"),
          label(
            "アイコンで操作を示す",
            "Fit an action into a small space",
          ),
          "icon-button",
        ),
        have(
          label("メニュー", "Action menu"),
          label(
            "操作の一覧を開く",
            "Open a list of commands",
          ),
          "menu",
        ),
        have(
          label("タブ", "Tabs"),
          label(
            "ページ内の表示を切り替える",
            "Switch views within a page",
          ),
          "tabs",
        ),
        have(
          label("ページ送り", "Pagination"),
          label(
            "一覧をページ単位で表示する",
            "Move between pages of results",
          ),
          "pagination",
        ),
        have(
          label("ステップ", "Steps"),
          label(
            "現在の手順を示す",
            "Show progress through a sequence",
          ),
          "steps",
        ),
        have(
          label("アコーディオン", "Accordion"),
          label(
            "見出しごとに開閉する",
            "Expand and collapse sections",
          ),
          "accordion",
        ),
        have(
          label("ツールバー", "Toolbar"),
          label(
            "対象への操作を横一列に並べる",
            "Group actions for one object",
          ),
          "toolbar",
        ),
        have(
          label("分割の境界", "Split view"),
          label(
            "領域の大きさをドラッグで変える",
            "Resize adjacent regions",
          ),
          "splitter",
        ),
        have(
          label("ポップオーバー", "Popover"),
          label(
            "補足説明や設定をその場で開く",
            "Open details or settings in place",
          ),
          "popover",
        ),
        have(
          label("ドロワー", "Drawer"),
          label(
            "画面端に補助パネルを開く",
            "Open a side panel",
          ),
          "drawer",
        ),
      ],
    },
    {
      title: label("入力", "Input"),
      entries: [
        have(
          label("1行の入力欄", "Text field"),
          label(
            "短いテキストを入力する",
            "Enter a short value",
          ),
          "fields",
        ),
        have(
          label("複数行の入力欄", "Text area"),
          label(
            "複数行のテキストを入力する",
            "Enter several lines of text",
          ),
          "fields",
        ),
        have(
          label(
            "セレクトボックス",
            "Select field",
          ),
          label(
            "一覧から1つ選ぶ",
            "Pick an option from a list",
          ),
          "fields",
        ),
        have(
          label("チェックボックス", "Checkbox"),
          label(
            "項目の選択と解除",
            "Select or clear a value",
          ),
          "fields",
        ),
        have(
          label("スイッチ", "Switch"),
          label(
            "オンとオフを即座に切り替える",
            "Turn a setting on or off",
          ),
          "properties",
        ),
        have(
          label("設定項目", "Property list"),
          label(
            "名前と値を1行に並べる",
            "Pair a setting with its control",
          ),
          "properties",
        ),
        have(
          label("フォーム", "Forms"),
          label(
            "入力項目の宣言からフォームを組み立てる",
            "Build a form from field declarations",
          ),
          "tpl-forms",
        ),
        have(
          label("ラジオボタン", "Radio group"),
          label(
            "選択肢を一覧して1つ選ぶ",
            "Choose one visible option",
          ),
          "radio",
        ),
        have(
          label(
            "切り替えボタン",
            "Segmented control",
          ),
          label(
            "横に並んだ2〜4個から1つ選ぶ",
            "Switch between a few adjacent choices",
          ),
          "segmented",
        ),
        have(
          label("数値の入力欄", "Number field"),
          label(
            "数値を入力、増減する",
            "Enter or step through numbers",
          ),
          "number-input",
        ),
        have(
          label("検索欄", "Search field"),
          label(
            "検索語で一覧を絞り込む",
            "Filter rows by a search term",
          ),
          "search-field",
        ),
        have(
          label("日付の入力欄", "Date field"),
          label("日付・時刻", "Choose a date"),
          "date-input",
        ),
        have(
          label("スライダー", "Slider"),
          label(
            "指定した範囲内で値を調整する",
            "Adjust a value within a range",
          ),
          "slider",
        ),
        have(
          label("ファイルの選択", "File picker"),
          label(
            "ファイルを選択する",
            "Choose a local file",
          ),
          "file-input",
        ),
        have(
          label("コード入力欄", "Code input"),
          label(
            "ソースコードを入力する",
            "Edit source text",
          ),
          "code-input",
        ),
        have(
          label(
            "入力候補付きの入力欄",
            "Input with suggestions",
          ),
          label(
            "入力に応じて候補を表示する",
            "Suggest values as the reader types",
          ),
          "suggest-input",
        ),
        have(
          label("複数選択", "Checkbox group"),
          label(
            "一覧から複数の項目を選ぶ",
            "Select several items",
          ),
          "check-group",
        ),
      ],
    },
    {
      title: label("表示", "Display"),
      entries: [
        have(
          label(
            "見出しと文章",
            "Headings and prose",
          ),
          label(
            "見出しや本文の書式を確認する",
            "Set type for titles and paragraphs",
          ),
          "type",
        ),
        have(
          label("表", "Data table"),
          label(
            "データを行と列で表示する",
            "Show values in rows and columns",
          ),
          "data-table",
        ),
        have(
          label("一覧", "Item list"),
          label(
            "項目を同じ形式の行で表示する",
            "Repeat a row for each item",
          ),
          "item-list",
        ),
        have(
          label("説明リスト", "Description list"),
          label(
            "項目名と値を組にして表示する",
            "Pair terms with values",
          ),
          "desc-list",
        ),
        have(
          label("カード", "Card"),
          label(
            "関連する情報や操作をまとめる",
            "Group related content and actions",
          ),
          "card",
        ),
        have(
          label("バッジ", "Badge"),
          label(
            "状態や件数を示す",
            "Show a status or count",
          ),
          "badge",
        ),
        have(
          label("タグ", "Tag"),
          label(
            "項目の分類を示す",
            "Identify a category",
          ),
          "badge",
        ),
        have(
          label("アバター", "Avatar"),
          label(
            "名前の頭文字で人や物を表す",
            "Identify an item by its initial",
          ),
          "avatar",
        ),
        have(
          label("区切り線", "Divider"),
          label(
            "内容の区切りを示す",
            "Separate groups of content",
          ),
          "divider",
        ),
        have(
          label("コード", "Code block"),
          label(
            "コードを等幅フォントで表示する",
            "Preserve code formatting",
          ),
          "code-block",
        ),
        have(
          label(
            "データがない場合",
            "Empty state",
          ),
          label(
            "データがない理由と次の操作を案内する",
            "Explain an empty list and offer a next step",
          ),
          "empty-state",
        ),
        have(
          label(
            "行のリストとステータス行",
            "Row list and status line",
          ),
          label(
            "行を選び、状態を 1 行で伝える",
            "Select a line and read its status",
          ),
          "row-list",
        ),
        have(
          label(
            "並べ替え可能な表",
            "Sortable table",
          ),
          label(
            "見出しを押して並べ替える",
            "Reorder rows by a column",
          ),
          "sort-table",
        ),
        have(
          label("カレンダー", "Calendar"),
          label(
            "月単位で日付を表示する",
            "Pick a day within a month",
          ),
          "calendar",
        ),
      ],
    },
    {
      title: label("通知", "Feedback"),
      entries: [
        have(
          label(
            "ダイアログ",
            "Confirmation dialog",
          ),
          label(
            "先へ進む前に確認を取る",
            "Confirm before proceeding",
          ),
          "dialog",
        ),
        have(
          label("トースト", "Toast"),
          label(
            "結果を短く知らせる",
            "Report the result of an action",
          ),
          "toasts",
        ),
        have(
          label("アラート", "Alert"),
          label(
            "ページ内に通知を表示する",
            "Keep a notice in the page",
          ),
          "alert",
        ),
        have(
          label("進捗表示", "Progress"),
          label(
            "処理の進捗を示す",
            "Show how much work is complete",
          ),
          "progress",
        ),
        have(
          label("読み込み中", "Spinner"),
          label(
            "読み込み中であることを示す",
            "Indicate that work is underway",
          ),
          "loading",
        ),
        have(
          label("スケルトン", "Skeleton"),
          label(
            "読み込み中に内容の配置を示す",
            "Preview the layout while content loads",
          ),
          "loading",
        ),
        have(
          label("ツールチップ", "Tooltip"),
          label(
            "フォーカス時やポインターを合わせたときに説明を表示する",
            "Show a short explanation on hover or focus",
          ),
          "tooltip",
        ),
      ],
    },
  ];

  const all = families.flatMap(
    (f: Family) => f.entries,
  );
  const made = all.filter(
    (e: Entry) => e.page !== "",
  );

  const cell = (
    link: Ctx["link"],
    e: Entry,
  ): SoftStr | Node =>
    e.page === ""
      ? label("未実装", "Unavailable")
      : link(
          e.page,
          label("表示例を見る", "Open example"),
        );

  return {
    id: "components",
    title: label(
      "コンポーネント一覧",
      "Component index",
    ),
    group: label("コンポーネント", "Components"),
    wide: false,
    body: ({ link }) => [
      h1(
        label(
          "コンポーネント一覧",
          "Component index",
        ),
      ),
      para(
        label(
          "列の本文に配置する基本的なコンポーネントの一覧です。plggmatic で利用できるものは、リンク先で表示例と使い方を確認できます。",
          "Choose a component to try it in the next column and see how to call it.",
        ),
      ),
      para(
        label(
          `全${all.length}種類のうち、${made.length}種類を利用できます。`,
          `This catalog covers ${made.length} of the ${all.length} entries below.`,
        ),
      ),
      ...families.flatMap((f: Family) => [
        h2(f.title),
        table(
          [
            label("コンポーネント", "Components"),
            label("用途", "Purpose"),
            label("表示例", "Example"),
          ],
          f.entries.map((e: Entry) => [
            e.name,
            e.what,
            cell(link, e),
          ]),
        ),
      ]),
    ],
  };
};
