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
const lack = (
  name: SoftStr,
  what: SoftStr,
): Entry => ({ name, what, page: "" });

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
      lack("アイコンボタン", "絵だけのボタン"),
      lack("メニュー", "押すと選択肢が出る"),
      lack("タブ", "同じ場所の中身を切り替える"),
      lack("ページ送り", "長い一覧を分けて進む"),
      lack("ステップ", "手順のどこに居るか"),
      lack(
        "アコーディオン",
        "見出しごとに開閉する",
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
      lack("ラジオボタン", "並べた中から1つ"),
      lack(
        "切り替えボタン",
        "2〜4個から1つ、横並び",
      ),
      lack("数値の入力欄", "数と増減"),
      lack("検索欄", "絞り込みの文字"),
      lack("日付の入力欄", "日付・時刻"),
      lack("スライダー", "範囲の中の値"),
      lack("ファイルの選択", "ファイルを渡す"),
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
      lack("表", "行と列のデータ"),
      lack("一覧", "同じ形の行の並び"),
      lack("説明の並び", "項目名と値の対"),
      lack("カード", "ひとまとまりの箱"),
      lack("バッジ", "状態や数の小さな印"),
      lack("タグ", "分類の札"),
      lack("アバター", "人や物の丸い印"),
      lack("区切り線", "まとまりの境目"),
      lack("コード", "等幅で見せる文字"),
      lack("空の状態", "何もないときの案内"),
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
      lack("注意書き", "ページの中に置く知らせ"),
      lack("進み具合", "どこまで終わったか"),
      lack("読み込み中", "待っていることを示す"),
      lack("スケルトン", "中身が来る前の形"),
      lack(
        "ツールチップ",
        "乗せると出る短い説明",
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
