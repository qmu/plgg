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
import { componentPages } from "./componentPages.ts";

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
      "plggmatic は、複数のページを横並びの列で表示する UI フレームワークです。このガイドでも標準レイアウトを使っています。",
    ),
    para(
      "画面左にサイドバーがあり、その右にページが並びます。ページ内のリンクを選ぶと、リンク先が右隣の列に開きます。",
      link("layout", "レイアウトの基本"),
      "または",
      link("buttons", "ボタン"),
      "を選んで試せます。初めて使う方は、",
      link("layout", "レイアウトの基本"),
      "からお読みください。",
    ),
    h2("ガイドの内容"),
    list(
      [
        link("layout", "レイアウトの基本"),
        "・",
        link("shell", "標準レイアウト"),
        "・",
        link("share", "列幅と表示列数"),
        "・",
        link("metrics", "寸法"),
        " — 画面の構成と列の動作",
      ],
      [
        link("looks", "スキンを差し替える"),
        "・",
        link("colors", "色"),
        "・",
        link("type", "文字"),
        " — レイアウトとは独立して変更できる外観の設定",
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
      "スタイルシートを読み込み、標準レイアウトで画面を描画します。レイアウト用の CSS を追加する必要はありません。",
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
      "実装の詳細は、",
      link("shell", "標準レイアウト"),
      "を参照してください。",
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
      "スキンを指定しない場合は、モノトーンが適用されます。ここでは罫線や角の形、強調表示、アニメーションの特徴を説明します。変更方法は、",
      link("looks", "スキンを差し替える"),
      "を参照してください。",
    ),
    h2("罫線の色"),
    para(
      "モノトーンでは、文字と同じ色の罫線で領域を区切ります。",
    ),
    h2("ボタンと枠の形"),
    para(
      "ボタン、入力欄、列の角は丸めません。例外は、",
      link("theme", "テーマ切り替え"),
      "と列を左右に送るボタンです。どちらも列の上に重ねて表示するため、丸い形を使います。",
    ),
    h2("白黒の反転による強調"),
    para(
      "サイドバーの現在の項目、右隣の列を開いたリンク、トップページのロゴは、文字の部分だけ白黒を反転します。ポインターを合わせた行には薄い背景色を付けます。アクセントカラーは使いません。",
    ),
    h2("アニメーションの長さ"),
    para(
      "列の開閉や切り替えのアニメーションは短めです。各操作に対応する動きは、",
      link("layout", "レイアウトの基本"),
      "で定義しています。",
    ),
    para(
      "列幅の決め方については、",
      link("share", "列幅と表示列数"),
      "を参照してください。",
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
      "スキンでは、色、罫線、角の丸み、フォント、アニメーションの速さを設定します。同じレイアウトのまま、画面の外観を変更できます。",
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
        "スキンを選ぶと、罫線の色、角の丸み、強調表示、フォント、アニメーションの速さが変わります。列の位置や幅、開閉時の動きは共通です。",
      ),
    ),
    h2("各スキンに共通するレイアウト"),
    list(
      [
        "画面左にサイドバー、その右にページの列を配置します。",
      ],
      [
        "各列にはヘッダーと本文があり、本文は列ごとにスクロールできます。",
      ],
      [
        "表示領域の幅を各ページに配分します。列は開くときに広がり、閉じるときに縮みます（",
        link("share", "列幅と表示列数"),
        "）。",
      ],
      [
        "現在のページに対応する項目と、右隣の列を開いたリンクを強調表示します。",
      ],
    ),
    h2("スキンごとの表示の違い"),
    table(
      ["設定項目", "モノトーン", "ソフト"],
      [
        ["線の色", "文字と同じ色", "薄い灰色"],
        ["角", "丸めない", "丸める"],
        [
          "選択状態の強調",
          "白黒を反転",
          "薄い背景色",
        ],
        [
          "列に重ねる要素の影",
          "薄い影",
          "濃い影",
        ],
        [
          "文字",
          "Inter / Noto Sans JP",
          "OS の標準フォント",
        ],
        ["アニメーション", "速い", "ゆっくり"],
      ],
    ),
    h2("書き方"),
    para(
      "スキンはデータとして定義します。既定のスキンをコピーし、変更したい項目だけを上書きできます。",
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
      "モノトーンの設定については、",
      link("rules", "既定のスキン"),
      "を参照してください。これらの設定はスキンごとに変更できます。",
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
      "色には用途に応じた名前が付いています。ライトテーマとダークテーマで名前は共通ですが、対応する色の値が変わります。画面左下の",
      link("theme", "テーマ切り替え"),
      "を押すと、このページの色見本にも反映されます。",
    ),
    h2("無彩色"),
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
      "ページ内の見出しと本文の表示例です。見出しは太さで区別し、段落は読みやすい幅で折り返します。",
    ),
    example(
      h1("見出し 1 — ページの名前"),
      para(
        "見出し 1 の直後の段落はページの説明として扱い、本文よりも薄い色で表示します。",
      ),
      h2("見出し 2 — 章"),
      para(
        "本文の行の高さは文字サイズの1.75倍、文字サイズは 15px です。",
        code("code"),
        "は等幅フォントと薄い背景色で表示します。",
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
    para(
      "標準レイアウトで使用する主な寸法を示します。",
    ),
    table(
      ["項目", "寸法", "適用箇所"],
      [
        [
          "サイドバーの幅",
          "256px",
          "標準レイアウト",
        ],
        [
          "折りたたみ時のサイドバー幅",
          "3rem",
          "標準レイアウト",
        ],
        ["ヘッダーの高さ", "3rem", "すべての列"],
        ["本文の最大幅", "48rem", "ページ本文"],
        [
          "2列になる画面幅",
          "960px 以上",
          "列幅と表示列数",
        ],
        [
          "3列になる画面幅",
          "1760px 以上",
          "列幅と表示列数",
        ],
      ],
    ),
    para(
      "画面幅と列数の関係については、",
      link("share", "列幅と表示列数"),
      "を参照してください。",
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
      "通常の操作には枠線のみのボタン、主要な操作には塗りつぶしたボタン、削除には赤い枠線のボタンを使います。",
    ),
    example(
      row(
        plain(
          "通常",
          btnClass,
          msg.press(),
          false,
        ),
        plain(
          "主要な操作",
          `${btnClass} ${btnPrimaryClass}`,
          msg.press(),
          false,
        ),
        plain(
          "削除",
          `${btnClass} ${btnDangerClass}`,
          msg.openDialog(),
          false,
        ),
        plain(
          "無効",
          btnClass,
          msg.press(),
          true,
        ),
      ),
      para(`押した回数：${model.presses}`),
    ),
    para(
      "「削除」を押すと、確認用の",
      link("dialog", "ダイアログ"),
      "が開きます。",
    ),
    h2("ボタンの実装例"),
    para(
      code("button"),
      "は、主要な操作に使うボタンを1つ返します。",
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
    h2("複数のボタンの配置"),
    para(
      "複数のボタンを横に並べるには、",
      code("actionsClass"),
      "の中に配置します。",
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
            "キャンセル",
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
      "入力欄の上にラベルを表示します。入力欄にフォーカスが移ると、枠線が太くなります。",
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
                ? some(
                    "24文字以内で入力してください",
                  )
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
            placeholder: some("メモを入力"),
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
      "名前に25文字以上入力すると、エラーメッセージが表示されます。保存すると",
      link("toasts", "トースト"),
      "が表示されます。",
    ),
    h2("無効な入力欄"),
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
  title: "設定項目",
  group: "コンポーネント：入力",
  wide: false,
  body: ({ model, link }) => [
    h1("設定項目"),
    para(
      "設定パネルには、対象の設定項目を1行ずつ並べます。各行の左側に項目名、右側に値を変更するためのコントロールを配置します。",
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
        `現在の設定：配置 ${model.layout}、吸着 ${model.snap}、循環を禁止 ${model.acyclic ? "オン" : "オフ"}、上限 ${model.maxOut === "" ? "なし" : model.maxOut}`,
      ),
    ),
    h2("設定項目の動作"),
    list(
      [
        "各行にコントロールを1つ配置し、その値を設定値として使います。",
      ],
      [
        "値を変更するとすぐに設定に反映されるため、送信ボタンはありません。",
      ],
      [
        "オンとオフは、位置や色に加えて文字でも示します。",
      ],
    ),
    para(
      "複数の項目を上から順に入力するフォームには、",
      link("fields", "入力欄"),
      "を使います。",
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
  group: "コンポーネント：通知",
  wide: false,
  body: ({ model }) => [
    h1("ダイアログ"),
    para(
      "取り消せない操作を実行する前に、ダイアログで確認します。ダイアログの外側の暗い部分を押すと閉じます。",
    ),
    example(
      plain(
        "記録を削除…",
        `${btnClass} ${btnDangerClass}`,
        msg.openDialog(),
        false,
      ),
    ),
    ...(model.dialog
      ? [
          confirmDialog<Msg>({
            title: "この記録を削除しますか？",
            body: "削除すると元に戻せません。",
            confirmLabel: "削除",
            cancelLabel: "キャンセル",
            destructive: true,
            onConfirm: msg.confirmDialog(),
            onCancel: msg.closeDialog(),
          }),
        ]
      : []),
    source(
      [
        "confirmDialog({",
        '  title: "この記録を削除しますか？",',
        '  body: "削除すると元に戻せません。",',
        '  confirmLabel: "削除",',
        '  cancelLabel: "キャンセル",',
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
  group: "コンポーネント：通知",
  wide: false,
  body: () => [
    h1("トースト"),
    para(
      "画面右下に操作の結果を短く表示します。通知には次の4種類があります。",
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
    h2("複数の通知の表示例"),
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
  title: "リンクとパンくずリスト",
  group: "コンポーネント：操作",
  wide: false,
  body: ({ link }) => [
    h1("リンクとパンくずリスト"),
    para(
      "ページ内のリンクには下線が付き、ポインターを合わせると文字色と背景色が反転します。リンク先は右隣の列に開き、その列を開いている間はリンクの反転表示が続きます。表示例：",
      link("colors", "色"),
      "、",
      link("type", "文字"),
      "。",
    ),
    h2("外部リンク"),
    example(
      textLink({
        label: "plgg のリポジトリ",
        to: "https://github.com/qmu/plgg",
        external: true,
      }),
    ),
    h2("パンくずリスト"),
    para(
      "パンくずリストは、階層の深い画面で現在の位置を示し、上位のページに戻るために使います。標準レイアウトでは各列のヘッダーがこの役割を果たします。",
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
      "ライトテーマとダークテーマを切り替えるボタンです。既定のスキンでは丸い形で、標準レイアウトではサイドバーの下端に表示されます。",
    ),
    example(
      themeToggle<Msg>({
        scheme: model.scheme,
        toggle: msg.toggleScheme(),
      }),
      para(`現在のテーマ：${model.scheme}`),
    ),
    para(
      "切り替えると、",
      link("colors", "色"),
      "の見本を含め、画面全体に反映されます。選択したテーマはブラウザに保存されます。",
    ),
  ],
};

const shellPage: Page = {
  id: "shell",
  title: "標準レイアウトの実装",
  group: "レイアウトの仕組み",
  wide: false,
  body: ({ link }) => [
    h1("標準レイアウト"),
    para(
      "このガイドで使っている plggmatic の標準レイアウトです。",
    ),
    h2("画面の構成"),
    list(
      [
        "左のサイドバーには製品名、グループごとに開閉できる目次、折りたたみボタンがあります。最下部にはテーマ切り替えボタンがあります。",
      ],
      [
        "ページが1つのときは、サイドバーの右側全体に表示します。リンクを選ぶと右隣にページが開き、幅を等分します（",
        link("share", "列幅と表示列数"),
        "）。",
      ],
      [
        "各列の上部にヘッダーがあり、その下の本文は列ごとにスクロールできます。",
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
        "    resolve: (id) => …,  // 項目に対応するアドレスを取得",
        "    current: (id) => …,  // 現在のページに対応する項目かを判定",
        "    toggle: true,        // グループを開閉する",
        "    numbered: false,     // true で項目に 01、02、… と番号を付ける",
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
      "を一度読み込みます。配色は",
      link("colors", "色"),
      "、その他の外観の設定は",
      link("rules", "既定のスキン"),
      "を参照してください。",
    ),
  ],
};

const share: Page = {
  id: "share",
  title: "列幅と表示列数",
  group: "レイアウトの仕組み",
  wide: false,
  body: ({ link }) => [
    h1("列幅と表示列数"),
    para(
      "サイドバーの右側にある表示領域を、開いているページに配分します。同時に表示する列の数は画面幅によって決まります。",
    ),
    table(
      ["画面の幅", "表示列数"],
      [
        ["960px 未満", "1"],
        ["960px 以上", "2"],
        ["1760px 以上", "3"],
      ],
    ),
    h2("ページ数に応じた表示"),
    list(
      [
        "ページが1つの場合は、サイドバーの右側全体を使います。",
      ],
      ["2つの場合は、表示領域の幅を等分します。"],
      [
        "同時に表示できる数を超えてページを開くと、手前の列の幅を保ったまま、ページの表示領域が横にスクロールします。",
      ],
      [
        "表示領域の左右にある送りボタンで、1列ずつ移動できます。",
      ],
    ),
    para(
      "このページから",
      link("colors", "色"),
      "を開き、さらにページ内のリンクを選ぶと、列の動きを確認できます。",
    ),
    h2("2列分の幅を使うページ"),
    para(
      "画面全体を紹介するページには、2列分の幅を使えます。",
      link("tpl-business", "業務アプリ"),
      "がその例です。",
    ),
    source(
      [
        "{ route, title, close, wide: true, body }",
        "// 2列分の幅を使用（表示領域の幅が上限）",
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
      "目次の項目をグループに分け、各行を罫線で区切ります。現在のページに対応する項目は反転表示します。",
    ),
    list(
      [
        "目次はグループごとに開閉できます。初期状態では、現在のページを含むグループだけが開いています。",
      ],
      [
        "各グループ内の項目には、01から順に番号が付きます。",
      ],
      [
        "製品名の右にあるボタンを押すと、サイドバーを折りたためます。折りたたみ状態は保存されます。",
      ],
    ),
    para(
      "サイドバーだけを使うこともできます（",
      code("sidebarNav"),
      "）。画面全体の構成は、",
      link("shell", "標準レイアウト"),
      "を参照してください。",
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
      "受託開発の管理を題材にした画面例です。メニュー、一覧、詳細、関連情報の順に、右隣の列にページが開きます。",
    ),
    screen(
      "./demo1.html",
      "DevDesk — 業務メニュー",
    ),
    para(
      "たどったページの順序は「道筋」として URL に記録されます。途中の列でリンクを選ぶと、その右側の列が新しいリンク先に置き換わります。固定パネルを使う例は、",
      link("tpl-workspace", "ワークスペース"),
      "を参照してください。",
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
      "左側に会話などの固定パネルを配置し、その右側でメニューと列をスクロールできる画面です。列が増えると、固定パネルは最小幅に達するまで狭くなります。",
    ),
    screen(
      "./demo4.html?x=Lprojects.Sstorefront",
      "ワークスペース",
    ),
    para(
      "メニューは細く折りたためます。一覧から詳細を開く操作は、",
      link("tpl-business", "業務アプリ"),
      "と同じです。",
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
      "入力項目を宣言して組み立てたフォームです。入力内容の検証、ダイアログでの確認、トーストでの結果通知までを試せます。",
    ),
    screen("./forms.html", "フォーム"),
    para(
      "この例では、",
      link("fields", "入力欄"),
      "、",
      link("dialog", "ダイアログ"),
      "、",
      link("toasts", "トースト"),
      "を使用しています。",
    ),
  ],
};

/** The component sheets, family by family. */
const byFamily: ReadonlyArray<Page> = [
  "コンポーネント：操作",
  "コンポーネント：入力",
  "コンポーネント：表示",
  "コンポーネント：通知",
].flatMap((family: SoftStr) =>
  [
    buttons,
    links,
    theme,
    fields,
    properties,
    dialog,
    toasts,
    ...componentPages,
  ].filter((page: Page) => page.group === family),
);

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
  ...byFamily,
  tplBusiness,
  tplWorkspace,
  tplForms,
];
