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
      have(
        "ボタン",
        "押して何かを起こす",
        "buttons",
      ),
      have("リンク", "別のページを開く", "links"),
      have(
        "パンくず",
        "いまの場所までの道",
        "links",
      ),
      have(
        "テーマ切り替え",
        "明るい・暗いを切り替える",
        "theme",
      ),
      have(
        "アイコンボタン",
        "絵だけのボタン",
        "icon-button",
      ),
      have(
        "メニュー",
        "押すと選択肢が出る",
        "menu",
      ),
      have(
        "タブ",
        "同じ場所の中身を切り替える",
        "tabs",
      ),
      have(
        "ページ送り",
        "長い一覧を分けて進む",
        "pagination",
      ),
      have(
        "ステップ",
        "手順のどこに居るか",
        "steps",
      ),
      have(
        "アコーディオン",
        "見出しごとに開閉する",
        "accordion",
      ),
      have(
        "ポップオーバー",
        "押すと出る小さな箱",
        "popover",
      ),
      have(
        "ドロワー",
        "端から出る補助の面",
        "drawer",
      ),
    ],
  },
  {
    title: "入力",
    entries: [
      have("一行の入力欄", "短い文字", "fields"),
      have(
        "複数行の入力欄",
        "長い文字",
        "fields",
      ),
      have(
        "選択（セレクト）",
        "一覧から1つ",
        "fields",
      ),
      have(
        "チェックボックス",
        "はい・いいえ",
        "fields",
      ),
      have(
        "スイッチ",
        "すぐ効く入・切",
        "properties",
      ),
      have(
        "設定の行",
        "名前と値を1行に並べる",
        "properties",
      ),
      have(
        "フォーム",
        "宣言から組む入力のまとまり",
        "tpl-forms",
      ),
      have(
        "ラジオボタン",
        "並べた中から1つ",
        "radio",
      ),
      have(
        "切り替えボタン",
        "2〜4個から1つ、横並び",
        "segmented",
      ),
      have(
        "数値の入力欄",
        "数と増減",
        "number-input",
      ),
      have(
        "検索欄",
        "絞り込みの文字",
        "search-field",
      ),
      have(
        "日付の入力欄",
        "日付・時刻",
        "date-input",
      ),
      have(
        "スライダー",
        "範囲の中の値",
        "slider",
      ),
      have(
        "ファイルの選択",
        "ファイルを渡す",
        "file-input",
      ),
      have(
        "候補つきの入力欄",
        "打つと候補が出る",
        "suggest-input",
      ),
      have(
        "複数の選択",
        "一覧からいくつか",
        "check-group",
      ),
    ],
  },
  {
    title: "見せる",
    entries: [
      have(
        "見出しと文章",
        "ページの文字組み",
        "type",
      ),
      have("表", "行と列のデータ", "data-table"),
      have(
        "一覧",
        "同じ形の行の並び",
        "item-list",
      ),
      have(
        "説明の並び",
        "項目名と値の対",
        "desc-list",
      ),
      have("カード", "ひとまとまりの箱", "card"),
      have(
        "バッジ",
        "状態や数の小さな印",
        "badge",
      ),
      have("タグ", "分類の札", "badge"),
      have(
        "アバター",
        "人や物の丸い印",
        "avatar",
      ),
      have(
        "区切り線",
        "まとまりの境目",
        "divider",
      ),
      have(
        "コード",
        "等幅で見せる文字",
        "code-block",
      ),
      have(
        "空の状態",
        "何もないときの案内",
        "empty-state",
      ),
      have(
        "並べ替えできる表",
        "見出しを押して並べ替える",
        "sort-table",
      ),
      have(
        "カレンダー",
        "月の中の日付",
        "calendar",
      ),
    ],
  },
  {
    title: "知らせる",
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
        "注意書き",
        "ページの中に置く知らせ",
        "alert",
      ),
      have(
        "進み具合",
        "どこまで終わったか",
        "progress",
      ),
      have(
        "読み込み中",
        "待っていることを示す",
        "loading",
      ),
      have(
        "スケルトン",
        "中身が来る前の形",
        "loading",
      ),
      have(
        "ツールチップ",
        "乗せると出る短い説明",
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
    ? "まだありません"
    : link(e.page, "あります");

export const componentIndex: Page = {
  id: "components",
  title: "コンポーネント一覧",
  group: "コンポーネント",
  wide: false,
  body: ({ link }) => [
    h1("コンポーネント一覧"),
    para(
      "列の本文の中に置く部品です。UI フレームワークにふつう入っている基本の部品を並べ、plggmatic にあるものには見本へのリンクを付けています。",
    ),
    para(
      `いま ${all.length} 個のうち ${made.length} 個があります。`,
    ),
    ...families.flatMap((f: Family) => [
      h2(f.title),
      table(
        ["部品", "何をするか", "見本"],
        f.entries.map((e: Entry) => [
          e.name,
          e.what,
          cell(link, e),
        ]),
      ),
    ]),
  ],
};
