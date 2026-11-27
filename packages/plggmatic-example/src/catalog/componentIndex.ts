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

export const families: ReadonlyArray<Family> = [
  {
    title: "操作",
    entries: [
      have("ボタン", "操作を実行する", "buttons"),
      have("リンク", "別のページを開く", "links"),
      have(
        "パンくずリスト",
        "現在のページの階層を示す",
        "links",
      ),
      have(
        "テーマ切り替え",
        "ライトテーマとダークテーマを切り替える",
        "theme",
      ),
      have(
        "アイコンボタン",
        "アイコンで操作を示す",
        "icon-button",
      ),
      have(
        "メニュー",
        "操作の一覧を開く",
        "menu",
      ),
      have(
        "タブ",
        "ページ内の表示を切り替える",
        "tabs",
      ),
      have(
        "ページ送り",
        "一覧をページ単位で表示する",
        "pagination",
      ),
      have(
        "ステップ",
        "現在の手順を示す",
        "steps",
      ),
      have(
        "アコーディオン",
        "見出しごとに開閉する",
        "accordion",
      ),
      have(
        "ツールバー",
        "対象への操作を横一列に並べる",
        "toolbar",
      ),
      have(
        "分割の境界",
        "領域の大きさをドラッグで変える",
        "splitter",
      ),
      have(
        "ポップオーバー",
        "補足説明や設定をその場で開く",
        "popover",
      ),
      have(
        "ドロワー",
        "画面端に補助パネルを開く",
        "drawer",
      ),
    ],
  },
  {
    title: "入力",
    entries: [
      have(
        "1行の入力欄",
        "短いテキストを入力する",
        "fields",
      ),
      have(
        "複数行の入力欄",
        "複数行のテキストを入力する",
        "fields",
      ),
      have(
        "セレクトボックス",
        "一覧から1つ選ぶ",
        "fields",
      ),
      have(
        "チェックボックス",
        "項目の選択と解除",
        "fields",
      ),
      have(
        "スイッチ",
        "オンとオフを即座に切り替える",
        "properties",
      ),
      have(
        "設定項目",
        "名前と値を1行に並べる",
        "properties",
      ),
      have(
        "フォーム",
        "入力項目の宣言からフォームを組み立てる",
        "tpl-forms",
      ),
      have(
        "ラジオボタン",
        "選択肢を一覧して1つ選ぶ",
        "radio",
      ),
      have(
        "切り替えボタン",
        "横に並んだ2〜4個から1つ選ぶ",
        "segmented",
      ),
      have(
        "数値の入力欄",
        "数値を入力、増減する",
        "number-input",
      ),
      have(
        "検索欄",
        "検索語で一覧を絞り込む",
        "search-field",
      ),
      have(
        "日付の入力欄",
        "日付・時刻",
        "date-input",
      ),
      have(
        "スライダー",
        "指定した範囲内で値を調整する",
        "slider",
      ),
      have(
        "ファイルの選択",
        "ファイルを選択する",
        "file-input",
      ),
      have(
        "コード入力欄",
        "ソースコードを入力する",
        "code-input",
      ),
      have(
        "入力候補付きの入力欄",
        "入力に応じて候補を表示する",
        "suggest-input",
      ),
      have(
        "複数選択",
        "一覧から複数の項目を選ぶ",
        "check-group",
      ),
    ],
  },
  {
    title: "表示",
    entries: [
      have(
        "見出しと文章",
        "見出しや本文の書式を確認する",
        "type",
      ),
      have(
        "表",
        "データを行と列で表示する",
        "data-table",
      ),
      have(
        "一覧",
        "項目を同じ形式の行で表示する",
        "item-list",
      ),
      have(
        "説明リスト",
        "項目名と値を組にして表示する",
        "desc-list",
      ),
      have(
        "カード",
        "関連する情報や操作をまとめる",
        "card",
      ),
      have("バッジ", "状態や件数を示す", "badge"),
      have("タグ", "項目の分類を示す", "badge"),
      have(
        "アバター",
        "名前の頭文字で人や物を表す",
        "avatar",
      ),
      have(
        "区切り線",
        "内容の区切りを示す",
        "divider",
      ),
      have(
        "コード",
        "コードを等幅フォントで表示する",
        "code-block",
      ),
      have(
        "データがない場合",
        "データがない理由と次の操作を案内する",
        "empty-state",
      ),
      have(
        "行のリストとステータス行",
        "行を選び、状態を 1 行で伝える",
        "row-list",
      ),
      have(
        "並べ替え可能な表",
        "見出しを押して並べ替える",
        "sort-table",
      ),
      have(
        "カレンダー",
        "月単位で日付を表示する",
        "calendar",
      ),
    ],
  },
  {
    title: "通知",
    entries: [
      have(
        "ダイアログ",
        "先へ進む前に確認を取る",
        "dialog",
      ),
      have(
        "トースト",
        "結果を短く知らせる",
        "toasts",
      ),
      have(
        "アラート",
        "ページ内に通知を表示する",
        "alert",
      ),
      have(
        "進捗表示",
        "処理の進捗を示す",
        "progress",
      ),
      have(
        "読み込み中",
        "読み込み中であることを示す",
        "loading",
      ),
      have(
        "スケルトン",
        "読み込み中に内容の配置を示す",
        "loading",
      ),
      have(
        "ツールチップ",
        "フォーカス時やポインターを合わせたときに説明を表示する",
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
    ? "未実装"
    : link(e.page, "表示例を見る");

export const componentIndex: Page = {
  id: "components",
  title: "コンポーネント一覧",
  group: "コンポーネント",
  wide: false,
  body: ({ link }) => [
    h1("コンポーネント一覧"),
    para(
      "列の本文に配置する基本的なコンポーネントの一覧です。plggmatic で利用できるものは、リンク先で表示例と使い方を確認できます。",
    ),
    para(
      `全${all.length}種類のうち、${made.length}種類を利用できます。`,
    ),
    ...families.flatMap((f: Family) => [
      h2(f.title),
      table(
        ["コンポーネント", "用途", "表示例"],
        f.entries.map((e: Entry) => [
          e.name,
          e.what,
          cell(link, e),
        ]),
      ),
    ]),
  ],
};
