import { type SoftStr, some, none } from "plgg";
import {
  button,
  textLink,
  textInput,
  textArea,
  selectInput,
  checkbox,
  breadcrumb,
  toast,
  confirmDialog,
  themeToggle,
  propertyList,
  propertyRow,
  choice,
  entry,
  toggle,
  btnClass,
  btnPrimaryClass,
  btnDangerClass,
  actionsClass,
  formClass,
  cssVarRef,
} from "plggmatic";
import {
  neutrals,
  semanticRoles,
  variants,
} from "plggmatic/style";
import {
  el,
  text,
  attr,
  onClick,
} from "plgg-view";
import { type Msg, msg } from "./model.ts";
import {
  type Node,
  h1,
  h2,
  h3,
  para,
  code,
  list,
  source,
  example,
  row,
  table,
  screen,
  swatch,
} from "./parts.ts";
import { type Page } from "./page.ts";
import {
  layoutRules,
  columnPage,
  openPage,
  narrowPage,
  motionPage,
} from "./layoutChapter.ts";
import { componentIndex } from "./componentIndex.ts";

export type { Page } from "./page.ts";

/** A plain hook-styled button, for the three weights. */
const plain = (
  label: SoftStr,
  klass: SoftStr,
  on: Msg,
  disabled: boolean,
): Node =>
  el(
    "button",
    [
      attr("type", "button"),
      attr("class", klass),
      ...(disabled
        ? [attr("disabled", "")]
        : [onClick<Msg>(on)]),
    ],
    [text(label)],
  );

const overview: Page = {
  id: "overview",
  title: "plggmatic",
  group: "はじめに",
  wide: false,
  body: ({ link }) => [
    h1("plggmatic"),
    para(
      "列を横に並べる画面のための UI フレームワークです。このページ自体が、その標準の画面でできています。",
    ),
    para(
      "左にサイドバー、その右に開いているページが並びます。ページの中のリンクを押すと、行き先が右の列に開きます。試しに ",
      link("layout", "レイアウトの決まり"),
      " か ",
      link("buttons", "ボタン"),
      " を押してみてください。最初に読むのは ",
      link("layout", "レイアウトの決まり"),
      " です。",
    ),
    h2("何が入っているか"),
    list(
      [
        link("layout", "レイアウトの決まり"),
        "・",
        link("shell", "標準の画面"),
        "・",
        link("share", "列を分け合う"),
        "・",
        link("metrics", "寸法"),
        " — レイアウトの仕組み。画面がどう組まれ、どう動くか",
      ],
      [
        link("looks", "スキンを差し替える"),
        "・",
        link("colors", "色"),
        "・",
        link("type", "文字"),
        " — スキン。レイアウトの仕組みとは別に持ち、差し替えられます",
      ],
      [
        link("buttons", "ボタン"),
        "・",
        link("fields", "入力欄"),
        "・",
        link("dialog", "ダイアログ"),
        "・",
        link("toasts", "トースト"),
        " — コンポーネント",
      ],
      [
        link("tpl-business", "業務アプリ"),
        "・",
        link("tpl-workspace", "ワークスペース"),
        " — 画面の例",
      ],
    ),
    h2("使い始める"),
    para(
      "スタイルを1枚入れて、標準の画面を描くだけです。レイアウトの CSS は書きません。",
    ),
    source(
      [
        'import { kitCss, shell, defaultTheme } from "plggmatic";',
        "",
        "style.textContent = kitCss(defaultTheme);",
        "",
        "const view = (model) =>",
        "  shell({",
        '    brand: "my app",',
        "    nav: { groups, resolve, current, toggle: true, … },",
        "    pages: openPages(model),",
        "    …",
        "  });",
      ].join("\n"),
    ),
    para(
      "くわしくは ",
      link("shell", "標準の画面"),
      " に書いてあります。",
    ),
  ],
};

const rules: Page = {
  id: "rules",
  title: "既定のスキン：モノトーン",
  group: "スキン",
  wide: false,
  body: ({ link }) => [
    h1("既定のスキン：モノトーン"),
    para(
      "何も指定しないときのスキンです。線・角・強調・動きを、こう決めています。別のスキンにする方法は ",
      link("looks", "スキンを差し替える"),
      " にあります。",
    ),
    h2("線は1色"),
    para(
      "区切りの線は、灰色ではなく文字と同じ色で引きます。枠は塗るものではなく、描くものです。",
    ),
    h2("角は丸めない"),
    para(
      "ボタンも入力欄も列も、四角です。丸いのは ",
      link("theme", "テーマ切り替え"),
      " だけです。",
    ),
    h2("強調は白黒の反転だけ"),
    para(
      "いま居る場所（サイドバーの行、右の列を開いたリンク、トップページでのロゴ）は、その文字の部分だけ、文字と背景を入れ替えて示します。マウスを乗せた行は、薄い色が付くだけです。色のアクセントは使いません。",
    ),
    h2("動きは速い"),
    para(
      "開く・閉じる・入れ替えるの動きは短く、すぐ終わります。どう動くかはスキンではなく、",
      link("layout", "レイアウトの決まり"),
      " が決めています。",
    ),
    para(
      "列の幅の決まりは ",
      link("share", "列を分け合う"),
      " にあります。",
    ),
  ],
};

const looks: Page = {
  id: "looks",
  title: "スキンを差し替える",
  group: "スキン",
  wide: false,
  body: ({ model, link }) => [
    h1("スキンを差し替える"),
    para(
      "plggmatic は、レイアウトの仕組みとスキン（色・線・角・文字・動きの速さ）を分けて持ちます。同じ仕組みの上で、まったく違うスキンになるのは、ふつうのことです。",
    ),
    h2("切り替えてみる"),
    example(
      row(
        plain(
          "モノトーン（既定）",
          model.look === "monochrome"
            ? `${btnClass} ${btnPrimaryClass}`
            : btnClass,
          msg.setLook("monochrome"),
          false,
        ),
        plain(
          "ソフト",
          model.look === "soft"
            ? `${btnClass} ${btnPrimaryClass}`
            : btnClass,
          msg.setLook("soft"),
          false,
        ),
      ),
      para(
        "押すと、線の色・角の丸み・強調のしかた・文字・動きの速さが変わります。列の位置や幅、開閉の動きは変わりません。",
      ),
    ),
    h2("仕組みが決めること"),
    list(
      [
        "左にサイドバー、その右にページの列があること。",
      ],
      [
        "どの列も「名前の帯＋自分でスクロールする本文」であること。",
      ],
      [
        "ページが幅を分け合い、開くときは広がり、閉じるときは縮むこと（",
        link("share", "列を分け合う"),
        "）。",
      ],
      [
        "いま居る場所と、右の列を開いたリンクに「印」が付くこと。",
      ],
    ),
    h2("スキンが決めること"),
    table(
      ["決めること", "モノトーン", "ソフト"],
      [
        ["線の色", "文字と同じ色", "薄い灰色"],
        ["角", "丸めない", "丸める"],
        [
          "印の付け方",
          "白黒を反転",
          "薄く色を敷く",
        ],
        ["浮くもの", "影なし", "影あり"],
        [
          "文字",
          "Inter / Noto Sans JP",
          "OS の文字",
        ],
        ["動き", "速い", "ゆっくり"],
      ],
    ),
    h2("書き方"),
    para(
      "スキンはデータです。既定を写して、変えたいところだけ書き換えられます。",
    ),
    source(
      [
        'import { kitCss, monochrome } from "plggmatic";',
        "",
        "// 既定（モノトーン）",
        "kitCss(theme);",
        "",
        "// 自分のスキン",
        "kitCss(theme, {",
        "  ...monochrome,",
        '  radius: "6px",',
        '  rule: "border",',
        "});",
      ].join("\n"),
    ),
    para(
      "既定の決まりは ",
      link("rules", "既定のスキン"),
      " にあります。あれは「モノトーンの決まり」で、仕組みの決まりではありません。",
    ),
  ],
};

const colors: Page = {
  id: "colors",
  title: "色",
  group: "スキン",
  wide: false,
  body: ({ link }) => [
    h1("色"),
    para(
      "色は役割の名前で持ちます。明・暗は、同じ名前の値が入れ替わるだけです。左下の ",
      link("theme", "テーマ切り替え"),
      " を押すと、このページの色見本もいっしょに変わります。",
    ),
    h2("地の色"),
    el(
      "div",
      [attr("class", "cat-swatches")],
      neutrals.map((name) => swatch(name)),
    ),
    ...semanticRoles.flatMap((role) => [
      h2(role),
      el(
        "div",
        [attr("class", "cat-swatches")],
        variants.map((variant) =>
          swatch(`${role}-${variant}`),
        ),
      ),
    ]),
    h2("使い方"),
    source(
      [
        'import { cssVarRef } from "plggmatic";',
        "",
        '`color:${cssVarRef("text")}`',
        "// → color:" + cssVarRef("text"),
      ].join("\n"),
    ),
  ],
};

const type: Page = {
  id: "type",
  title: "文字",
  group: "スキン",
  wide: false,
  body: () => [
    h1("文字"),
    para(
      "ページの中の文字組みです。見出しは太さで、段落は読みやすい幅で折り返します。",
    ),
    example(
      h1("見出し 1 — ページの名前"),
      para(
        "見出し 1 のすぐ下の段落は、そのページの説明として、少し薄い色になります。",
      ),
      h2("見出し 2 — 章"),
      para(
        "本文です。行間は 1.75、大きさは 15px。",
        code("code"),
        " は等幅で、薄い地が付きます。",
      ),
      h3("見出し 3 — 節"),
      list(
        ["箇条書きの1つ目"],
        ["箇条書きの2つ目"],
      ),
    ),
    h2("表"),
    table(
      ["役割", "大きさ", "太さ"],
      [
        ["見出し 1", "1.375rem", "600"],
        ["見出し 2", "1.0625rem", "600"],
        ["見出し 3", "0.9375rem", "600"],
        ["本文", "15px", "400"],
      ],
    ),
  ],
};

const metrics: Page = {
  id: "metrics",
  title: "寸法",
  group: "レイアウトの仕組み",
  wide: false,
  body: ({ link }) => [
    h1("寸法"),
    para("画面の骨組みを決めている長さです。"),
    table(
      ["もの", "値", "どこで効くか"],
      [
        ["サイドバーの幅", "256px", "標準の画面"],
        [
          "たたんだサイドバー",
          "3rem",
          "標準の画面",
        ],
        ["名前の帯の高さ", "3rem", "どの列も"],
        [
          "本文の読みやすい幅",
          "48rem",
          "ページの中の文章",
        ],
        [
          "2列になる画面幅",
          "960px から",
          "列を分け合う",
        ],
        [
          "3列になる画面幅",
          "1760px から",
          "列を分け合う",
        ],
      ],
    ),
    para(
      "列の数の決まりは ",
      link("share", "列を分け合う"),
      " を見てください。",
    ),
  ],
};

const buttons: Page = {
  id: "buttons",
  title: "ボタン",
  group: "コンポーネント：操作",
  wide: false,
  body: ({ model, link }) => [
    h1("ボタン"),
    para(
      "ふつうのボタンは枠だけ、いちばん大事な操作は塗り、消す操作は赤い枠です。",
    ),
    example(
      row(
        plain(
          "ふつう",
          btnClass,
          msg.press(),
          false,
        ),
        plain(
          "いちばん大事",
          `${btnClass} ${btnPrimaryClass}`,
          msg.press(),
          false,
        ),
        plain(
          "消す",
          `${btnClass} ${btnDangerClass}`,
          msg.openDialog(),
          false,
        ),
        plain(
          "押せない",
          btnClass,
          msg.press(),
          true,
        ),
      ),
      para(`押した回数：${model.presses}`),
    ),
    para(
      "「消す」は確認の ",
      link("dialog", "ダイアログ"),
      " を開きます。",
    ),
    h2("部品として"),
    para(
      code("button"),
      " は、いちばん大事な操作のボタンを1つ返します。",
    ),
    example(
      button<Msg>({
        label: "保存する",
        onPress: msg.toast("success"),
        disabled: false,
      }),
    ),
    source(
      [
        "button({",
        '  label: "保存する",',
        "  onPress: save,",
        "  disabled: false,",
        "})",
      ].join("\n"),
    ),
    h2("並べる"),
    para(
      "ボタンを並べるときは ",
      code("actionsClass"),
      " の箱に入れます。",
    ),
    example(
      el(
        "div",
        [attr("class", actionsClass)],
        [
          plain(
            "保存",
            `${btnClass} ${btnPrimaryClass}`,
            msg.toast("success"),
            false,
          ),
          plain(
            "やめる",
            btnClass,
            msg.press(),
            false,
          ),
        ],
      ),
    ),
  ],
};

const fields: Page = {
  id: "fields",
  title: "入力欄",
  group: "コンポーネント：入力",
  wide: false,
  body: ({ model, link }) => [
    h1("入力欄"),
    para(
      "ラベルが上、その下に四角い枠。フォーカスすると枠が太くなります。",
    ),
    example(
      el(
        "div",
        [attr("class", formClass)],
        [
          textInput<Msg>({
            name: "cat-name",
            label: "名前",
            value: model.name,
            placeholder: some(
              "例：ACME storefront",
            ),
            error:
              model.name.length > 24
                ? some("24文字までです")
                : none(),
            disabled: false,
            onInput: msg.setName,
          }),
          selectInput<Msg>({
            name: "cat-role",
            label: "種類",
            value: model.role,
            options: [
              { value: "fixed", label: "固定額" },
              { value: "tm", label: "時間精算" },
              {
                value: "retainer",
                label: "月額",
              },
            ],
            error: none(),
            disabled: false,
            onChange: msg.setRole,
          }),
          textArea<Msg>({
            name: "cat-note",
            label: "メモ",
            value: model.note,
            placeholder:
              some("気づいたことを書く"),
            error: none(),
            disabled: false,
            onInput: msg.setNote,
          }),
          checkbox<Msg>({
            name: "cat-agree",
            label: "関係者に知らせる",
            checked: model.agree,
            disabled: false,
            onToggle: msg.toggleAgree(),
          }),
          el(
            "div",
            [attr("class", actionsClass)],
            [
              plain(
                "保存",
                `${btnClass} ${btnPrimaryClass}`,
                msg.save(),
                false,
              ),
            ],
          ),
        ],
      ),
      para(
        model.saved === ""
          ? "まだ保存していません。"
          : `保存した内容：${model.saved}`,
      ),
    ),
    para(
      "名前を 25文字以上入れると、エラーの出方が見られます。保存すると ",
      link("toasts", "トースト"),
      " が出ます。",
    ),
    h2("押せない状態"),
    example(
      textInput<Msg>({
        name: "cat-locked",
        label: "変更できない欄",
        value: "確定済み",
        placeholder: none(),
        error: none(),
        disabled: true,
        onInput: msg.setName,
      }),
    ),
  ],
};

const properties: Page = {
  id: "properties",
  title: "設定の行",
  group: "コンポーネント：入力",
  wide: false,
  body: ({ model, link }) => [
    h1("設定の行"),
    para(
      "1つのものの設定を、1行に1つずつ並べます。左に名前、右にそれを決める部品。調べる・整える用のパネルの形です。",
    ),
    example(
      propertyList<Msg>("図全体", [
        propertyRow(
          "cat-layout",
          "配置",
          choice<Msg>({
            name: "cat-layout",
            value: model.layout,
            options: [
              { value: "none", label: "なし" },
              {
                value: "down",
                label: "階層（下へ）",
              },
              {
                value: "right",
                label: "階層（右へ）",
              },
            ],
            disabled: false,
            onChange: msg.setLayout,
          }),
        ),
        propertyRow(
          "cat-snap",
          "吸着",
          choice<Msg>({
            name: "cat-snap",
            value: model.snap,
            options: [
              { value: "0", label: "なし" },
              { value: "8", label: "8" },
              { value: "16", label: "16" },
              { value: "32", label: "32" },
            ],
            disabled: false,
            onChange: msg.setSnap,
          }),
        ),
        propertyRow(
          "cat-acyclic",
          "循環を禁止",
          toggle<Msg>({
            name: "cat-acyclic",
            on: model.acyclic,
            onLabel: "オン",
            offLabel: "オフ",
            disabled: false,
            onToggle: msg.toggleAcyclic(),
          }),
        ),
        propertyRow(
          "cat-max",
          "出力数の上限",
          entry<Msg>({
            name: "cat-max",
            value: model.maxOut,
            placeholder: some("なし"),
            numeric: true,
            disabled: false,
            onInput: msg.setMaxOut,
          }),
        ),
        propertyRow(
          "cat-fixed",
          "変更できない行",
          toggle<Msg>({
            name: "cat-fixed",
            on: false,
            onLabel: "オン",
            offLabel: "オフ",
            disabled: true,
            onToggle: msg.done(),
          }),
        ),
      ]),
      para(
        `いまの値：配置 ${model.layout}、吸着 ${model.snap}、循環を禁止 ${model.acyclic ? "オン" : "オフ"}、上限 ${model.maxOut === "" ? "なし" : model.maxOut}`,
      ),
    ),
    h2("きまり"),
    list(
      [
        "1行に部品は1つ。その部品の値が、その行のすべてです。",
      ],
      [
        "送信ボタンはありません。部品を変えた時点で効きます。",
      ],
      [
        "オン・オフは、位置や色だけでなく言葉でも示します。",
      ],
    ),
    para(
      "上から順に書き込んでいく形は ",
      link("fields", "入力欄"),
      " を使います。",
    ),
    source(
      [
        'propertyList("図全体", [',
        '  propertyRow("snap", "吸着",',
        '    choice({ name: "snap", value, options, … })),',
        '  propertyRow("acyclic", "循環を禁止",',
        '    toggle({ name: "acyclic", on, onLabel, offLabel, … })),',
        '  propertyRow("max", "出力数の上限",',
        '    entry({ name: "max", value, numeric: true, … })),',
        "])",
      ].join("\n"),
    ),
  ],
};

const dialog: Page = {
  id: "dialog",
  title: "ダイアログ",
  group: "コンポーネント：知らせる",
  wide: false,
  body: ({ model }) => [
    h1("ダイアログ"),
    para(
      "取り消せない操作の前に、確認を取ります。背景は暗くなり、押すと閉じます。",
    ),
    example(
      plain(
        "記録を消す…",
        `${btnClass} ${btnDangerClass}`,
        msg.openDialog(),
        false,
      ),
    ),
    ...(model.dialog
      ? [
          confirmDialog<Msg>({
            title: "この記録を消しますか",
            body: "消すと元に戻せません。",
            confirmLabel: "消す",
            cancelLabel: "やめる",
            destructive: true,
            onConfirm: msg.confirmDialog(),
            onCancel: msg.closeDialog(),
          }),
        ]
      : []),
    source(
      [
        "confirmDialog({",
        '  title: "この記録を消しますか",',
        '  body: "消すと元に戻せません。",',
        '  confirmLabel: "消す",',
        '  cancelLabel: "やめる",',
        "  destructive: true,",
        "  onConfirm, onCancel,",
        "})",
      ].join("\n"),
    ),
  ],
};

const toasts: Page = {
  id: "toasts",
  title: "トースト",
  group: "コンポーネント：知らせる",
  wide: false,
  body: () => [
    h1("トースト"),
    para(
      "操作の結果を、画面の右下に短く知らせます。調子は4つです。",
    ),
    example(
      row(
        plain(
          "成功",
          btnClass,
          msg.toast("success"),
          false,
        ),
        plain(
          "情報",
          btnClass,
          msg.toast("info"),
          false,
        ),
        plain(
          "注意",
          btnClass,
          msg.toast("warning"),
          false,
        ),
        plain(
          "失敗",
          btnClass,
          msg.toast("danger"),
          false,
        ),
      ),
    ),
    h2("並べたところ"),
    example(
      toast<Msg>({
        id: "sample-success",
        tone: "success",
        message: "保存しました",
        onDismiss: msg.done(),
      }),
      toast<Msg>({
        id: "sample-danger",
        tone: "danger",
        message: "保存できませんでした",
        onDismiss: msg.done(),
      }),
    ),
  ],
};

const links: Page = {
  id: "links",
  title: "リンクとパンくず",
  group: "コンポーネント：操作",
  wide: false,
  body: ({ link }) => [
    h1("リンクとパンくず"),
    para(
      "ページの中のリンクは下線付きで、マウスを乗せると反転します。押すと行き先が右の列に開き、開いているあいだは反転したままです：",
      link("colors", "色"),
      "、",
      link("type", "文字"),
      "。",
    ),
    h2("外へのリンク"),
    example(
      textLink({
        label: "plgg のリポジトリ",
        to: "https://github.com/qmu/plgg",
        external: true,
      }),
    ),
    h2("パンくず"),
    para(
      "入れ子の深い画面で、いま居る場所を上にたどる行です。標準の画面では使いません（列の名前の帯がその役目です）。",
    ),
    example(
      breadcrumb<Msg>([
        {
          label: "案件",
          to: some("?p=overview"),
        },
        {
          label: "ACME",
          to: some("?p=overview"),
        },
        { label: "見積", to: none() },
      ]),
    ),
  ],
};

const theme: Page = {
  id: "theme",
  title: "テーマ切り替え",
  group: "コンポーネント：操作",
  wide: false,
  body: ({ model, link }) => [
    h1("テーマ切り替え"),
    para(
      "明・暗を切り替える丸いボタンです。標準の画面では、サイドバーのいちばん下にあります。",
    ),
    example(
      themeToggle<Msg>({
        scheme: model.scheme,
        toggle: msg.toggleScheme(),
      }),
      para(`いまは ${model.scheme} です。`),
    ),
    para(
      "切り替えると、",
      link("colors", "色"),
      " の見本も含めて画面全体が変わります。選んだほうはブラウザに保存されます。",
    ),
  ],
};

const shellPage: Page = {
  id: "shell",
  title: "標準の画面（書き方）",
  group: "レイアウトの仕組み",
  wide: false,
  body: ({ link }) => [
    h1("標準の画面"),
    para(
      "「plggmatic で作って」と言われたときに出てくる画面です。いま見ているのがそれです。",
    ),
    h2("できていること"),
    list(
      [
        "左のサイドバー：製品の名前、グループごとに開閉する目次、たたむボタン、いちばん下にテーマ切り替え。",
      ],
      [
        "右のページ：1枚なら右側いっぱい、リンクを押すと右に開いて半分ずつ（",
        link("share", "列を分け合う"),
        "）。",
      ],
      [
        "どの列も、上に名前の帯、下に自分でスクロールする本文。",
      ],
    ),
    h2("書き方"),
    source(
      [
        "shell({",
        '  brand: "plggmatic",',
        '  home: "/",',
        "  atHome: false,",
        "  nav: {",
        "    groups,              // 目次（グループと項目）",
        "    resolve: (id) => …,  // 項目からアドレスへ",
        "    current: (id) => …,  // いま居る項目か",
        "    toggle: true,        // グループを開閉する",
        "    numbered: false,     // true で 01, 02, … と数える",
        '    label: "目次",',
        "  },",
        "  folded: model.folded,",
        "  fold: [onClick(toggleFold)],",
        "  foot: [themeToggle({ … })],",
        "  pages: [",
        "    { route, title, close: none(), wide: false, body },",
        "    { route, title, close: some(href), wide: false, body },",
        "  ],",
        "})",
      ].join("\n"),
    ),
    para(
      "スタイルは ",
      code("kitCss(theme)"),
      " を1回入れるだけです。色は ",
      link("colors", "色"),
      "、決まりは ",
      link("rules", "既定のスキン"),
      " にあります。",
    ),
  ],
};

const share: Page = {
  id: "share",
  title: "列を分け合う",
  group: "レイアウトの仕組み",
  wide: false,
  body: ({ link }) => [
    h1("列を分け合う"),
    para(
      "開いているページは、サイドバーの右の幅を分け合います。並ぶ数は画面の幅で決まります。",
    ),
    table(
      ["画面の幅", "並ぶ数"],
      [
        ["960px 未満", "1"],
        ["960px から", "2"],
        ["1760px から", "3"],
      ],
    ),
    h2("動き"),
    list(
      ["1枚だけなら、右側いっぱいに広がります。"],
      ["2枚なら、半分ずつです。"],
      [
        "並ぶ数を超えて開くと、手前の列の幅はそのままで、帯が横にスクロールします。",
      ],
      [
        "左右の端に送りボタンが出て、1列ずつ動かせます。",
      ],
    ),
    para(
      "試すには、ここから ",
      link("colors", "色"),
      " を開き、その中のリンクでさらに右へ進んでください。",
    ),
    h2("2列ぶんのページ"),
    para(
      "画面をまるごと見せるページは、2列ぶんの幅を取ります。たとえば ",
      link("tpl-business", "業務アプリ"),
      " です。",
    ),
    source(
      [
        "{ route, title, close, wide: true, body }",
        "// → 2列ぶん（部屋の幅を超えない）",
      ].join("\n"),
    ),
  ],
};

const sidebar: Page = {
  id: "sidebar",
  title: "サイドバー",
  group: "レイアウトの仕組み",
  wide: false,
  body: ({ link }) => [
    h1("サイドバー"),
    para(
      "罫線で区切った行が、名前の付いたグループに入ります。いまのページの行は反転します。",
    ),
    list(
      [
        "グループは開閉できます。開いたときは、いまのページが入っているグループだけが開いています。",
      ],
      [
        "行には、グループごとに 01 から番号が付きます。",
      ],
      [
        "名前の右のボタンで、細い帯にたためます。たたんだ状態は保存されます。",
      ],
    ),
    para(
      "サイドバーだけを使うこともできます（",
      code("sidebarNav"),
      "）。画面全体は ",
      link("shell", "標準の画面"),
      " です。",
    ),
  ],
};

const tplBusiness: Page = {
  id: "tpl-business",
  title: "業務アプリ",
  group: "画面の例",
  wide: true,
  body: ({ link }) => [
    h1("業務アプリ"),
    para(
      "メニューから一覧、一覧から詳細、詳細から関連へと、列が右へ伸びていく画面です。受託開発の管理を題材にしています。",
    ),
    screen(
      "./demo1.html",
      "DevDesk — 業務メニュー",
    ),
    para(
      "列が増えていく仕組みは「道筋」です。URL に手順が並び、押した列より右は捨てられます。固定パネルのある形は ",
      link("tpl-workspace", "ワークスペース"),
      " にあります。",
    ),
  ],
};

const tplWorkspace: Page = {
  id: "tpl-workspace",
  title: "ワークスペース",
  group: "画面の例",
  wide: true,
  body: ({ link }) => [
    h1("ワークスペース"),
    para(
      "左に固定のパネル（会話など）があり、その右でメニューと列がスクロールする画面です。列が増えると、パネルは最小の幅まで場所をゆずります。",
    ),
    screen(
      "./demo4.html?x=Lprojects.Sstorefront",
      "ワークスペース",
    ),
    para(
      "メニューは細い帯にたためます。一覧から詳細へ進む作りは ",
      link("tpl-business", "業務アプリ"),
      " と同じです。",
    ),
  ],
};

const tplForms: Page = {
  id: "tpl-forms",
  title: "フォーム",
  group: "画面の例",
  wide: true,
  body: ({ link }) => [
    h1("フォーム"),
    para(
      "宣言から組んだフォームです。入力、検証、確認のダイアログ、結果のトーストまでが1つの流れになっています。",
    ),
    screen("./forms.html", "フォーム"),
    para(
      "部品は ",
      link("fields", "入力欄"),
      "、",
      link("dialog", "ダイアログ"),
      "、",
      link("toasts", "トースト"),
      " です。",
    ),
  ],
};

/** Every page, in the order the sidebar lists them. */
export const pages: ReadonlyArray<Page> = [
  overview,
  layoutRules,
  columnPage,
  openPage,
  share,
  sidebar,
  narrowPage,
  motionPage,
  metrics,
  shellPage,
  looks,
  rules,
  colors,
  type,
  componentIndex,
  buttons,
  links,
  theme,
  fields,
  properties,
  dialog,
  toasts,
  tplBusiness,
  tplWorkspace,
  tplForms,
];
