import {
  gettingStarted,
  extending,
  scheduledExample,
} from "./guideChapter.ts";
import { type Locale, labels } from "./locale.ts";
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
  tokenSwatches,
} from "./parts.ts";
import { type Page } from "./page.ts";
import { layoutChapter } from "./layoutChapter.ts";
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

const makePages = (
  locale: Locale,
): ReadonlyArray<Page> => {
  const label = labels(locale);
  const overview: Page = {
    id: "overview",
    title: "plggmatic",
    group: label("はじめに", "Getting started"),
    wide: false,
    body: ({ link }) => [
      h1("plggmatic"),
      para(
        label(
          "plggmatic は、複数のページを横並びの列で表示する UI フレームワークです。このガイドでも標準レイアウトを使っています。",
          "plggmatic is a UI framework for arranging related pages in columns. This guide uses that layout itself.",
        ),
      ),
      para(
        label(
          "画面左にサイドバーがあり、その右にページが並びます。ページ内のリンクを選ぶと、リンク先が右隣の列に開きます。",
          "Follow a link to keep this page in view while you read its destination. Try ",
        ),
        link(
          "layout",
          label(
            "レイアウトの基本",
            "Layout basics",
          ),
        ),
        label("または", " or "),
        link(
          "buttons",
          label("ボタン", "Buttons"),
        ),
        label(
          "を選んで試せます。初めて使う方は、",
          ". To build a screen of your own, start with ",
        ),
        link(
          "start",
          label(
            "インストールと動作確認",
            "Install and run the catalog",
          ),
        ),
        label("からお読みください。", "."),
      ),
      h2(label("ガイドの内容", "In this guide")),
      list(
        [
          link(
            "layout",
            label(
              "レイアウトの基本",
              "Layout basics",
            ),
          ),
          label("・", " · "),
          link(
            "shell",
            label(
              "標準レイアウト",
              "The standard shell",
            ),
          ),
          label("・", " · "),
          link(
            "share",
            label(
              "列幅と表示列数",
              "Sharing column width",
            ),
          ),
          label("・", " · "),
          link(
            "metrics",
            label("寸法", "Dimensions"),
          ),
          label(
            " — 画面の構成と列の動作",
            " — the structure of a screen",
          ),
        ],
        [
          link(
            "looks",
            label(
              "スキンを差し替える",
              "Switching skins",
            ),
          ),
          label("・", " · "),
          link("colors", label("色", "Colors")),
          label("・", " · "),
          link(
            "type",
            label("文字", "Typography"),
          ),
          label(
            " — レイアウトとは独立して変更できる外観の設定",
            " — appearance settings",
          ),
        ],
        [
          link(
            "buttons",
            label("ボタン", "Buttons"),
          ),
          label("・", " · "),
          link(
            "fields",
            label("入力欄", "Form fields"),
          ),
          label("・", " · "),
          link(
            "dialog",
            label(
              "ダイアログ",
              "Confirmation dialog",
            ),
          ),
          label("・", " · "),
          link(
            "toasts",
            label("トースト", "Toasts"),
          ),
          label(
            " — コンポーネント",
            " — interactive components",
          ),
        ],
        [
          link(
            "tpl-business",
            label(
              "業務アプリ",
              "Business application",
            ),
          ),
          label("・", " · "),
          link(
            "tpl-workspace",
            label("ワークスペース", "Workspace"),
          ),
          label(
            " — 画面の例",
            " — complete screens",
          ),
        ],
      ),
      h2(
        label("関連するガイド", "Related guides"),
      ),
      para(
        label(
          "サイトを作る手順は",
          "For site authoring, read the ",
        ),
        textLink({
          label: label(
            "plggpress ガイド",
            "plggpress guide",
          ),
          to: label(
            "https://plggpress.qmu.co.jp/",
            "https://plggpress.qmu.co.jp/en/",
          ),
          external: false,
        }),
        label(
          "へ、図の描き方は",
          ". For diagrams, see ",
        ),
        textLink({
          label: "plgg-flow",
          to: "https://plgg-flow.qmu.co.jp/",
          external: false,
        }),
        label(
          "へ進んでください。基盤ライブラリについては",
          ". For the underlying libraries, see the ",
        ),
        textLink({
          label: label(
            "plgg ガイド",
            "plgg guide",
          ),
          to: "https://plgg.qmu.co.jp/",
          external: false,
        }),
        label("で説明しています。", "."),
      ),
    ],
  };

  const rules: Page = {
    id: "rules",
    title: label(
      "既定のスキン：モノトーン",
      "The monochrome skin",
    ),
    group: label("スキン", "Skins"),
    wide: false,
    body: ({ link }) => [
      h1(
        label(
          "既定のスキン：モノトーン",
          "The monochrome skin",
        ),
      ),
      para(
        label(
          "スキンを指定しない場合は、モノトーンが適用されます。ここでは罫線や角の形、強調表示、アニメーションの特徴を説明します。変更方法は、",
          "Monochrome is the default skin. To change its rules, see ",
        ),
        link(
          "looks",
          label(
            "スキンを差し替える",
            "Switching skins",
          ),
        ),
        label("を参照してください。", "."),
      ),
      h2(label("罫線の色", "Rules and borders")),
      para(
        label(
          "モノトーンでは、primary-border の罫線で領域を区切ります。",
          "Monochrome separates regions with the primary-border token for rules.",
        ),
      ),
      h2(label("ボタンと枠の形", "Corners")),
      para(
        label(
          "ボタン、入力欄、列の角は丸めません。例外は、",
          "Buttons, inputs and columns have square corners. The ",
        ),
        link(
          "theme",
          label(
            "テーマ切り替え",
            "Appearance toggle",
          ),
        ),
        label(
          "と列を左右に送るボタンです。どちらも列の上に重ねて表示するため、丸い形を使います。",
          " and the carousel controls are round.",
        ),
      ),
      h2(
        label("白黒の反転による強調", "Emphasis"),
      ),
      para(
        label(
          "サイドバーの現在の項目、右隣の列を開いたリンク、トップページのロゴは、文字の部分だけ白黒を反転します。ポインターを合わせた行には薄い背景色を付けます。アクセントカラーは使いません。",
          "The active sidebar item and the link leading to the next column reverse ink and background around their text. Hovering over a row adds a light background.",
        ),
      ),
      h2(label("アニメーションの長さ", "Timing")),
      para(
        label(
          "列の開閉や切り替えのアニメーションは短めです。各操作に対応する動きは、",
          "Opening a column takes a short transition. Read about the movements in ",
        ),
        link(
          "layout",
          label(
            "レイアウトの基本",
            "Layout basics",
          ),
        ),
        label("で定義しています。", "."),
      ),
      para(
        label(
          "列幅の決め方については、",
          "For width calculations, see ",
        ),
        link(
          "share",
          label(
            "列幅と表示列数",
            "Sharing column width",
          ),
        ),
        label("を参照してください。", "."),
      ),
    ],
  };

  const looks: Page = {
    id: "looks",
    title: label(
      "スキンを差し替える",
      "Switching skins",
    ),
    group: label("スキン", "Skins"),
    wide: false,
    body: ({ model, link }) => [
      h1(
        label(
          "スキンを差し替える",
          "Switching skins",
        ),
      ),
      para(
        label(
          "スキンでは、色、罫線、角の丸み、フォント、アニメーションの速さを設定します。同じレイアウトのまま、画面の外観を変更できます。",
          "A skin sets the rules, corners, type, emphasis and timing across the screen. Try both skins on the same layout.",
        ),
      ),
      para(
        label(
          "kitCss(theme, appearance) は、寸法と構造を定める kitSystemCss(theme) に、配色とスキンを出力する kitAppearanceCss(theme, appearance) を続けたものです。実行中にスキンを切り替えるには、この2枚を順に読み込み、2枚目を差し替えます。",
          "kitCss(theme, appearance) combines the metrics and structure from kitSystemCss(theme) with the palette and skin from kitAppearanceCss(theme, appearance). To switch skins at run time, install the two sheets in that order and replace the second.",
        ),
      ),
      h2(label("切り替えてみる", "Try a skin")),
      example(
        row(
          plain(
            label(
              "モノトーン（既定）",
              "Monochrome (default)",
            ),
            model.look === "monochrome"
              ? `${btnClass} ${btnPrimaryClass}`
              : btnClass,
            msg.setLook("monochrome"),
            false,
          ),
          plain(
            label("ソフト", "Soft"),
            model.look === "soft"
              ? `${btnClass} ${btnPrimaryClass}`
              : btnClass,
            msg.setLook("soft"),
            false,
          ),
        ),
        para(
          label(
            "スキンを選ぶと、罫線の色、角の丸み、強調表示、フォント、アニメーションの速さが変わります。列の位置や幅、開閉時の動きは共通です。",
            "Switch skins and compare the borders and the selected button. The columns stay in the same order and share the same space.",
          ),
        ),
      ),
      h2(
        label(
          "各スキンに共通するレイアウト",
          "What the skins share",
        ),
      ),
      list(
        [
          label(
            "画面左にサイドバー、その右にページの列を配置します。",
            "The sidebar sits to the left of the open pages.",
          ),
        ],
        [
          label(
            "各列にはヘッダーと本文があり、本文は列ごとにスクロールできます。",
            "Each page has a header and an independently scrolling body.",
          ),
        ],
        [
          label(
            "表示領域の幅を各ページに配分します。列は開くときに広がり、閉じるときに縮みます（",
            "Pages share the available width (see ",
          ),
          link(
            "share",
            label(
              "列幅と表示列数",
              "Sharing column width",
            ),
          ),
          label("）。", ")."),
        ],
        [
          label(
            "現在のページに対応する項目と、右隣の列を開いたリンクを強調表示します。",
            "The current page and the link leading to its neighbor have a distinct state.",
          ),
        ],
      ),
      h2(
        label(
          "スキンごとの表示の違い",
          "How the skins differ",
        ),
      ),
      table(
        [
          label("項目", "Setting"),
          label("モノトーン", "Monochrome"),
          label("ソフト", "Soft"),
        ],
        [
          [
            label("線の色", "Rules"),
            "primary-border",
            label("薄い灰色", "Muted border"),
          ],
          [
            label("角", "Corners"),
            label("丸めない", "Square"),
            label("丸める", "Rounded"),
          ],
          [
            label("選択状態の強調", "Selection"),
            label("白黒を反転", "Inverted text"),
            label(
              "薄い背景色",
              "Tinted background",
            ),
          ],
          [
            label(
              "列に重ねる要素の影",
              "Overlay shadows",
            ),
            label("薄い影", "Light"),
            label("濃い影", "Stronger"),
          ],
          [
            label("文字", "Typography"),
            "Inter / Noto Sans JP",
            label(
              "OS の標準フォント",
              "System font",
            ),
          ],
          [
            label("アニメーション", "Motion"),
            label("速い", "Quick"),
            label("ゆっくり", "Slower"),
          ],
        ],
      ),
      h2(label("書き方", "Usage")),
      para(
        label(
          "スキンはデータとして定義します。既定のスキンをコピーし、変更したい項目だけを上書きできます。",
          "A skin is a value. Start with an existing skin and override the properties you need.",
        ),
      ),
      source(
        [
          'import { kitCss, monochrome } from "plggmatic";',
          "",
          label(
            "// 既定（モノトーン）",
            "// Default skin",
          ),
          "kitCss(theme);",
          "",
          label(
            "// 自分のスキン",
            "// Custom skin",
          ),
          "kitCss(theme, {",
          "  ...monochrome,",
          '  radius: "6px",',
          '  rule: "border",',
          "});",
        ].join("\n"),
      ),
      para(
        label(
          "モノトーンの設定については、",
          "For the default values, see ",
        ),
        link(
          "rules",
          label(
            "既定のスキン",
            "The monochrome skin",
          ),
        ),
        label(
          "を参照してください。これらの設定はスキンごとに変更できます。",
          ".",
        ),
      ),
    ],
  };

  const colors: Page = {
    id: "colors",
    title: label("色", "Colors"),
    group: label("スキン", "Skins"),
    wide: false,
    body: ({ link }) => [
      h1(label("色", "Colors")),
      para(
        label(
          "色には用途に応じた名前が付いています。ライトテーマとダークテーマで名前は共通ですが、対応する色の値が変わります。画面左下の",
          "Colors have names that describe their roles. The same token resolves to different values in light and dark mode. Try the ",
        ),
        link(
          "theme",
          label(
            "テーマ切り替え",
            "Appearance toggle",
          ),
        ),
        label(
          "を押すと、このページの色見本にも反映されます。",
          " to see the swatches change.",
        ),
      ),
      para(
        label(
          "ブランドの配色を使うときは、ライト・ダーク両方の値を asPalette で検証し、schemeCssOf で CSS にします。contrastRatio で文字と背景の組み合わせも確認できます。",
          "For a brand palette, validate both schemes with asPalette and emit the CSS with schemeCssOf. Use contrastRatio to check a text color against its background.",
        ),
      ),
      h2(label("無彩色", "Neutrals")),
      tokenSwatches(neutrals),
      ...semanticRoles.flatMap((role) => [
        h2(role),
        tokenSwatches(
          variants.map(
            (variant) => `${role}-${variant}`,
          ),
        ),
      ]),
      h2(label("使い方", "Usage")),
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
    title: label("文字", "Typography"),
    group: label("スキン", "Skins"),
    wide: false,
    body: () => [
      h1(label("文字", "Typography")),
      para(
        label(
          "ページ内の見出しと本文の表示例です。見出しは太さで区別し、段落は読みやすい幅で折り返します。",
          "Compare headings, paragraphs and code at the column width you are using.",
        ),
      ),
      example(
        h1(
          label(
            "見出し 1 — ページの名前",
            "Heading 1 — Page title",
          ),
        ),
        para(
          label(
            "見出し 1 の直後の段落はページの説明として扱い、本文よりも薄い色で表示します。",
            "A paragraph immediately following the first heading serves as a lead, in a muted color.",
          ),
        ),
        h2(
          label(
            "見出し 2 — 章",
            "Heading 2 — Section",
          ),
        ),
        para(
          label(
            "本文の行の高さは文字サイズの1.75倍、文字サイズは 15px です。",
            "Body text here uses a 15px font and a line height of 1.75. Inline ",
          ),
          code("code"),
          label(
            "は等幅フォントと薄い背景色で表示します。",
            " uses a monospaced font on a tinted background.",
          ),
        ),
        h3(
          label(
            "見出し 3 — 節",
            "Heading 3 — Subsection",
          ),
        ),
        list(
          [
            label(
              "箇条書きの1つ目",
              "First list item",
            ),
          ],
          [
            label(
              "箇条書きの2つ目",
              "Second list item",
            ),
          ],
        ),
      ),
      h2(label("表", "Type scale")),
      table(
        [
          label("役割", "Role"),
          label("大きさ", "Size"),
          label("太さ", "Weight"),
        ],
        [
          [
            label("見出し 1", "Heading 1"),
            "1.375rem",
            "600",
          ],
          [
            label("見出し 2", "Heading 2"),
            "1.0625rem",
            "600",
          ],
          [
            label("見出し 3", "Heading 3"),
            "0.9375rem",
            "600",
          ],
          [label("本文", "Body"), "15px", "400"],
        ],
      ),
    ],
  };

  const metrics: Page = {
    id: "metrics",
    title: label("寸法", "Dimensions"),
    group: label("レイアウトの仕組み", "Layout"),
    wide: false,
    body: ({ link }) => [
      h1(label("寸法", "Dimensions")),
      para(
        label(
          "標準レイアウトで使用する主な寸法を示します。",
          "These dimensions apply to the standard shell.",
        ),
      ),
      table(
        [
          label("項目", "Element"),
          label("寸法", "Dimensions"),
          label("適用箇所", "Where it applies"),
        ],
        [
          [
            label(
              "サイドバーの幅",
              "Sidebar width",
            ),
            "256px",
            label(
              "標準レイアウト",
              "The standard shell",
            ),
          ],
          [
            label(
              "折りたたみ時のサイドバー幅",
              "Folded sidebar width",
            ),
            "3rem",
            label(
              "標準レイアウト",
              "The standard shell",
            ),
          ],
          [
            label(
              "既定スキンのヘッダーの高さ",
              "Default skin header height",
            ),
            "3rem",
            label("すべての列", "All columns"),
          ],
          [
            label(
              "本文の最大幅",
              "Maximum text width",
            ),
            "48rem",
            label("ページ本文", "Page body"),
          ],
          [
            label(
              "2列になる画面幅",
              "Threshold for two columns",
            ),
            label("960px 以上", "960px and up"),
            label(
              "列幅と表示列数",
              "Sharing column width",
            ),
          ],
          [
            label(
              "3列になる画面幅",
              "Threshold for three columns",
            ),
            label("1760px 以上", "1760px and up"),
            label(
              "列幅と表示列数",
              "Sharing column width",
            ),
          ],
        ],
      ),
      para(
        label(
          "画面幅と列数の関係については、",
          "For the effect of screen width, see ",
        ),
        link(
          "share",
          label(
            "列幅と表示列数",
            "Sharing column width",
          ),
        ),
        label("を参照してください。", "."),
      ),
    ],
  };

  const buttons: Page = {
    id: "buttons",
    title: label("ボタン", "Buttons"),
    group: label(
      "コンポーネント：操作",
      "Components · Actions",
    ),
    wide: false,
    body: ({ model, link }) => [
      h1(label("ボタン", "Buttons")),
      para(
        label(
          "通常の操作には枠線のみのボタン、主要な操作には塗りつぶしたボタン、削除には赤い枠線のボタンを使います。",
          "Use an outlined button for a routine action, a filled button for the primary action and the danger style for deletion.",
        ),
      ),
      example(
        row(
          plain(
            label("通常", "Standard"),
            btnClass,
            msg.press(),
            false,
          ),
          plain(
            label("主要な操作", "Primary"),
            `${btnClass} ${btnPrimaryClass}`,
            msg.press(),
            false,
          ),
          plain(
            label("削除", "Delete"),
            `${btnClass} ${btnDangerClass}`,
            msg.openDialog(),
            false,
          ),
          plain(
            label("無効", "Disabled"),
            btnClass,
            msg.press(),
            true,
          ),
        ),
        para(
          label(
            `押した回数：${model.presses}`,
            `Presses: ${model.presses}`,
          ),
        ),
      ),
      para(
        label(
          "「削除」を押すと、確認用の",
          "Choose Delete to open a ",
        ),
        link(
          "dialog",
          label(
            "ダイアログ",
            "Confirmation dialog",
          ),
        ),
        label("が開きます。", "."),
      ),
      h2(
        label("ボタンの実装例", "Primary button"),
      ),
      para(
        code("button"),
        label(
          "は、主要な操作に使うボタンを1つ返します。",
          " renders a primary action button.",
        ),
      ),
      example(
        button<Msg>({
          label: label("保存する", "Save"),
          onPress: msg.toast("success"),
          disabled: false,
        }),
      ),
      source(
        [
          "button({",
          label(
            '  label: "保存する",',
            '  label: "Save",',
          ),
          "  onPress: save,",
          "  disabled: false,",
          "})",
        ].join("\n"),
      ),
      h2(
        label(
          "複数のボタンの配置",
          "Grouping buttons",
        ),
      ),
      para(
        label(
          "複数のボタンを横に並べるには、",
          "To place actions side by side, put them inside a container with ",
        ),
        code("actionsClass"),
        label("の中に配置します。", "."),
      ),
      example(
        el(
          "div",
          [attr("class", actionsClass)],
          [
            plain(
              label("保存", "Save"),
              `${btnClass} ${btnPrimaryClass}`,
              msg.toast("success"),
              false,
            ),
            plain(
              label("キャンセル", "Cancel"),
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
    title: label("入力欄", "Form fields"),
    group: label(
      "コンポーネント：入力",
      "Components · Input",
    ),
    wide: false,
    body: ({ model, link }) => [
      h1(label("入力欄", "Form fields")),
      para(
        label(
          "入力欄の上にラベルを表示します。入力欄にフォーカスが移ると、枠線が太くなります。",
          "Labels appear above the fields. Move focus between them to see the focus indicator.",
        ),
      ),
      example(
        el(
          "div",
          [attr("class", formClass)],
          [
            textInput<Msg>({
              name: "cat-name",
              label: label("名前", "Name"),
              value: model.name,
              placeholder: some(
                label(
                  "例：ACME storefront",
                  "e.g. ACME storefront",
                ),
              ),
              error:
                model.name.length > 24
                  ? some(
                      label(
                        "24文字以内で入力してください",
                        "Use at most 24 characters.",
                      ),
                    )
                  : none(),
              disabled: false,
              onInput: msg.setName,
            }),
            selectInput<Msg>({
              name: "cat-role",
              label: label("種類", "Billing"),
              value: model.role,
              options: [
                {
                  value: "fixed",
                  label: label(
                    "固定額",
                    "Fixed price",
                  ),
                },
                {
                  value: "tm",
                  label: label(
                    "時間精算",
                    "Time and materials",
                  ),
                },
                {
                  value: "retainer",
                  label: label("月額", "Monthly"),
                },
              ],
              error: none(),
              disabled: false,
              onChange: msg.setRole,
            }),
            textArea<Msg>({
              name: "cat-note",
              label: label("メモ", "Notes"),
              value: model.note,
              placeholder: some(
                label(
                  "メモを入力",
                  "Enter a note",
                ),
              ),
              error: none(),
              disabled: false,
              onInput: msg.setNote,
            }),
            checkbox<Msg>({
              name: "cat-agree",
              label: label(
                "関係者に知らせる",
                "Notify participants",
              ),
              checked: model.agree,
              disabled: false,
              onToggle: msg.toggleAgree(),
            }),
            el(
              "div",
              [attr("class", actionsClass)],
              [
                plain(
                  label("保存", "Save"),
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
            ? label(
                "まだ保存していません。",
                "Nothing saved yet.",
              )
            : label(
                `保存した内容：${model.saved}`,
                `Saved: ${model.saved}`,
              ),
        ),
      ),
      para(
        label(
          "名前に25文字以上入力すると、エラーメッセージが表示されます。保存すると",
          "Enter more than 24 characters to see the validation message. Saving displays a notification like those in ",
        ),
        link(
          "toasts",
          label("トースト", "Toasts"),
        ),
        label("が表示されます。", "."),
      ),
      h2(label("無効な入力欄", "Disabled field")),
      example(
        textInput<Msg>({
          name: "cat-locked",
          label: label(
            "変更できない欄",
            "Locked field",
          ),
          value: label("確定済み", "Finalized"),
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
    title: label("設定項目", "Property list"),
    group: label(
      "コンポーネント：入力",
      "Components · Input",
    ),
    wide: false,
    body: ({ model, link }) => [
      h1(label("設定項目", "Property list")),
      para(
        label(
          "設定パネルには、対象の設定項目を1行ずつ並べます。各行の左側に項目名、右側に値を変更するためのコントロールを配置します。",
          "A property list puts the setting name on the left and one control on the right. Try changing a value and watch the summary below.",
        ),
      ),
      example(
        propertyList<Msg>(
          label("図全体", "Diagram settings"),
          [
            propertyRow(
              "cat-layout",
              label("配置", "Layout"),
              choice<Msg>({
                name: "cat-layout",
                value: model.layout,
                options: [
                  {
                    value: "none",
                    label: label("なし", "None"),
                  },
                  {
                    value: "down",
                    label: label(
                      "階層（下へ）",
                      "Hierarchy (down)",
                    ),
                  },
                  {
                    value: "right",
                    label: label(
                      "階層（右へ）",
                      "Hierarchy (right)",
                    ),
                  },
                ],
                disabled: false,
                onChange: msg.setLayout,
              }),
            ),
            propertyRow(
              "cat-snap",
              label("吸着", "Snap"),
              choice<Msg>({
                name: "cat-snap",
                value: model.snap,
                options: [
                  {
                    value: "0",
                    label: label("なし", "None"),
                  },
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
              label(
                "循環を禁止",
                "Prevent cycles",
              ),
              toggle<Msg>({
                name: "cat-acyclic",
                on: model.acyclic,
                onLabel: label("オン", "On"),
                offLabel: label("オフ", "Off"),
                disabled: false,
                onToggle: msg.toggleAcyclic(),
              }),
            ),
            propertyRow(
              "cat-max",
              label(
                "出力数の上限",
                "Maximum outputs",
              ),
              entry<Msg>({
                name: "cat-max",
                value: model.maxOut,
                placeholder: some(
                  label("なし", "None"),
                ),
                numeric: true,
                disabled: false,
                onInput: msg.setMaxOut,
              }),
            ),
            propertyRow(
              "cat-fixed",
              label(
                "変更できない行",
                "Locked setting",
              ),
              toggle<Msg>({
                name: "cat-fixed",
                on: false,
                onLabel: label("オン", "On"),
                offLabel: label("オフ", "Off"),
                disabled: true,
                onToggle: msg.done(),
              }),
            ),
          ],
        ),
        para(
          label(
            `現在の設定：配置 ${model.layout}、吸着 ${model.snap}、循環を禁止 ${model.acyclic ? "オン" : "オフ"}、上限 ${model.maxOut === "" ? "なし" : model.maxOut}`,
            `Layout: ${model.layout}, snap: ${model.snap}, prevent cycles: ${model.acyclic ? "on" : "off"}, maximum: ${model.maxOut === "" ? "none" : model.maxOut}`,
          ),
        ),
      ),
      h2(
        label(
          "設定項目の動作",
          "How values change",
        ),
      ),
      list(
        [
          label(
            "各行にコントロールを1つ配置し、その値を設定値として使います。",
            "Each row has a single control bound to a setting.",
          ),
        ],
        [
          label(
            "値を変更するとすぐに設定に反映されるため、送信ボタンはありません。",
            "Changes apply immediately in this example.",
          ),
        ],
        [
          label(
            "オンとオフは、位置や色に加えて文字でも示します。",
            "The switch names both states so you can read its value without relying on color.",
          ),
        ],
      ),
      para(
        label(
          "複数の項目を上から順に入力するフォームには、",
          "For a form submitted as a whole, see ",
        ),
        link(
          "fields",
          label("入力欄", "Form fields"),
        ),
        label("を使います。", "."),
      ),
      source(
        [
          label(
            'propertyList("図全体", [',
            'propertyList("Diagram settings", [',
          ),
          label(
            '  propertyRow("snap", "吸着",',
            '  propertyRow("snap", "Snap",',
          ),
          '    choice({ name: "snap", value, options, … })),',
          label(
            '  propertyRow("acyclic", "循環を禁止",',
            '  propertyRow("acyclic", "Prevent cycles",',
          ),
          '    toggle({ name: "acyclic", on, onLabel, offLabel, … })),',
          label(
            '  propertyRow("max", "出力数の上限",',
            '  propertyRow("max", "Maximum outputs",',
          ),
          '    entry({ name: "max", value, numeric: true, … })),',
          "])",
        ].join("\n"),
      ),
    ],
  };

  const dialog: Page = {
    id: "dialog",
    title: label(
      "ダイアログ",
      "Confirmation dialog",
    ),
    group: label(
      "コンポーネント：通知",
      "Components · Feedback",
    ),
    wide: false,
    body: () => [
      h1(
        label(
          "ダイアログ",
          "Confirmation dialog",
        ),
      ),
      para(
        label(
          "取り消せない操作を実行する前に、ダイアログで確認します。ダイアログの外側の暗い部分を押すと閉じます。",
          "Ask for confirmation before an irreversible action. Select the backdrop to cancel.",
        ),
      ),
      example(
        plain(
          label("記録を削除…", "Delete record…"),
          `${btnClass} ${btnDangerClass}`,
          msg.openDialog(),
          false,
        ),
      ),
      source(
        [
          "confirmDialog({",
          label(
            '  title: "この記録を削除しますか？",',
            '  title: "Delete this record?",',
          ),
          label(
            '  body: "削除すると元に戻せません。",',
            '  body: "You cannot undo this action.",',
          ),
          label(
            '  confirmLabel: "削除",',
            '  confirmLabel: "Delete",',
          ),
          label(
            '  cancelLabel: "キャンセル",',
            '  cancelLabel: "Cancel",',
          ),
          "  destructive: true,",
          "  onConfirm, onCancel,",
          "})",
        ].join("\n"),
      ),
    ],
  };

  const toasts: Page = {
    id: "toasts",
    title: label("トースト", "Toasts"),
    group: label(
      "コンポーネント：通知",
      "Components · Feedback",
    ),
    wide: false,
    body: () => [
      h1(label("トースト", "Toasts")),
      para(
        label(
          "操作の結果を画面右下に表示します。4種類のボタンを押して、通知を閉じてみてください。自動で消す場合は、アプリ側でタイマーを設定します。",
          "Try each tone and dismiss the notification in the corner. If a notification should disappear after a delay, set that timer in your application.",
        ),
      ),
      example(
        row(
          plain(
            label("成功", "Success"),
            btnClass,
            msg.toast("success"),
            false,
          ),
          plain(
            label("情報", "Information"),
            btnClass,
            msg.toast("info"),
            false,
          ),
          plain(
            label("注意", "Warning"),
            btnClass,
            msg.toast("warning"),
            false,
          ),
          plain(
            label("失敗", "Error"),
            btnClass,
            msg.toast("danger"),
            false,
          ),
        ),
      ),
      h2(
        label(
          "複数の通知の表示例",
          "Multiple notifications",
        ),
      ),
      example(
        toast<Msg>({
          id: "sample-success",
          tone: "success",
          message: label(
            "保存しました",
            "Saved.",
          ),
          onDismiss: msg.done(),
        }),
        toast<Msg>({
          id: "sample-danger",
          tone: "danger",
          message: label(
            "保存できませんでした",
            "Could not save.",
          ),
          onDismiss: msg.done(),
        }),
      ),
    ],
  };

  const links: Page = {
    id: "links",
    title: label(
      "リンクとパンくずリスト",
      "Links and breadcrumbs",
    ),
    group: label(
      "コンポーネント：操作",
      "Components · Actions",
    ),
    wide: false,
    body: ({ link, hrefTo }) => [
      h1(
        label(
          "リンクとパンくずリスト",
          "Links and breadcrumbs",
        ),
      ),
      para(
        label(
          "ページ内のリンクには下線が付き、ポインターを合わせると文字色と背景色が反転します。リンク先は右隣の列に開き、その列を開いている間はリンクの反転表示が続きます。表示例：",
          "Follow either link to read its destination beside this page. Try ",
        ),
        link("colors", label("色", "Colors")),
        label("、", " or "),
        link("type", label("文字", "Typography")),
        label("。", "."),
      ),
      h2(label("外部リンク", "External link")),
      example(
        textLink({
          label: label(
            "plgg のリポジトリ",
            "The plgg repository",
          ),
          to: "https://github.com/qmu/plgg",
          external: true,
        }),
      ),
      h2(label("パンくずリスト", "Breadcrumbs")),
      para(
        label(
          "パンくずリストは、階層の深い画面で現在の位置を示し、上位のページに戻るために使います。標準レイアウトでは各列のヘッダーがこの役割を果たします。",
          "Breadcrumbs show the path to the current item. Supply a destination for each ancestor and leave the current item unlinked.",
        ),
      ),
      example(
        breadcrumb<Msg>([
          {
            label: label("ガイド", "Guide"),
            to: some(hrefTo("overview")),
          },
          {
            label: label(
              "部品一覧",
              "Component index",
            ),
            to: some(hrefTo("components")),
          },
          {
            label: label("リンク", "Links"),
            to: none(),
          },
        ]),
      ),
    ],
  };

  const theme: Page = {
    id: "theme",
    title: label(
      "テーマ切り替え",
      "Appearance toggle",
    ),
    group: label(
      "コンポーネント：操作",
      "Components · Actions",
    ),
    wide: false,
    body: ({ model, link }) => [
      h1(
        label(
          "テーマ切り替え",
          "Appearance toggle",
        ),
      ),
      para(
        label(
          "ライトテーマとダークテーマを切り替えるボタンです。既定のスキンでは丸い形で、標準レイアウトではサイドバーの下端に表示されます。",
          "Switch between light and dark colors. In the monochrome skin the control is round and fits in the sidebar footer.",
        ),
      ),
      example(
        themeToggle<Msg>({
          scheme: model.scheme,
          toggle: msg.toggleScheme(),
        }),
        para(
          label(
            `現在のテーマ：${model.scheme}`,
            `Current scheme: ${model.scheme}`,
          ),
        ),
      ),
      para(
        label(
          "切り替えると、",
          "The choice applies to the whole page, including the swatches under ",
        ),
        link("colors", label("色", "Colors")),
        label(
          "の見本を含め、画面全体に反映されます。選択したテーマはブラウザに保存されます。",
          ", and is saved in browser storage.",
        ),
      ),
    ],
  };

  const shellPage: Page = {
    id: "shell",
    title: label(
      "標準レイアウトの実装",
      "Using the shell",
    ),
    group: label("レイアウトの仕組み", "Layout"),
    wide: false,
    body: ({ link }) => [
      h1(
        label(
          "標準レイアウト",
          "The standard shell",
        ),
      ),
      para(
        label(
          "このガイドで使っている plggmatic の標準レイアウトです。",
          "Pass the sidebar and the ordered list of pages to shell. Your application supplies their addresses and handles navigation.",
        ),
      ),
      para(
        label(
          "pages の順番が左から右の表示順です。本文のリンクを開くときは、元のページまでを残し、右側を新しいページで置き換えます。close には右端を取り除いた状態のアドレスを渡します。最初の1枚には none() を渡します。",
          "The order of pages determines their positions from left to right. When a reader follows a link, keep the pages through its source and replace the rest with the destination. Give the last page a close address for the shorter strip. For a single page, pass none().",
        ),
      ),
      h2(
        label(
          "画面の構成",
          "Parts of the screen",
        ),
      ),
      list(
        [
          label(
            "左のサイドバーには製品名、グループごとに開閉できる目次、折りたたみボタンがあります。最下部にはテーマ切り替えボタンがあります。",
            "The sidebar holds the brand, navigation groups and fold control. Pass an appearance toggle in foot to put it below the navigation.",
          ),
        ],
        [
          label(
            "ページが1つのときは、サイドバーの右側全体に表示します。リンクを選ぶと右隣にページが開き、幅を等分します（",
            "A single page takes the space beside the sidebar. Open a second page to share that space (see ",
          ),
          link(
            "share",
            label(
              "列幅と表示列数",
              "Sharing column width",
            ),
          ),
          label("）。", ")."),
        ],
        [
          label(
            "各列の上部にヘッダーがあり、その下の本文は列ごとにスクロールできます。",
            "Each page has a fixed header above its scrolling body.",
          ),
        ],
      ),
      h2(label("書き方", "Usage")),
      source(
        [
          "shell({",
          '  brand: "plggmatic",',
          '  home: "/",',
          "  atHome: false,",
          "  nav: {",
          label(
            "    groups,              // 目次（グループと項目）",
            "    groups, // Navigation groups and items",
          ),
          label(
            "    resolve: (id) => …,  // 項目に対応するアドレスを取得",
            "    resolve: (id) => …, // Address for an item",
          ),
          label(
            "    current: (id) => …,  // 現在のページに対応する項目かを判定",
            "    current: (id) => …, // Is this the current item?",
          ),
          label(
            "    toggle: true,        // グループを開閉する",
            "    toggle: true, // Collapsible groups",
          ),
          label(
            "    numbered: false,     // true で項目に 01、02、… と番号を付ける",
            "    numbered: false, // Show numbered rows when true",
          ),
          label(
            '    label: "目次",',
            '    label: "Contents",',
          ),
          "  },",
          "  drawer: none(),",
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
        label("スタイルは ", "Load "),
        code("kitCss(theme)"),
        label(
          "を一度読み込みます。配色は",
          " once. See ",
        ),
        link("colors", label("色", "Colors")),
        label("、その他の外観の設定は", " and "),
        link(
          "rules",
          label(
            "既定のスキン",
            "The monochrome skin",
          ),
        ),
        label("を参照してください。", "."),
      ),
    ],
  };

  const share: Page = {
    id: "share",
    title: label(
      "列幅と表示列数",
      "Sharing column width",
    ),
    group: label("レイアウトの仕組み", "Layout"),
    wide: false,
    body: ({ link }) => [
      h1(
        label(
          "列幅と表示列数",
          "Sharing column width",
        ),
      ),
      para(
        label(
          "サイドバーの右側にある表示領域を、開いているページに配分します。同時に表示する列の数は画面幅によって決まります。",
          "Pages share the space beside the sidebar. The viewport width sets the strip’s maximum number of visible columns.",
        ),
      ),
      table(
        [
          label("画面の幅", "Viewport width"),
          label("表示列数", "Column capacity"),
        ],
        [
          [
            label("960px 未満", "Below 960px"),
            "1",
          ],
          [
            label("960px 以上", "960px and up"),
            "2",
          ],
          [
            label("1760px 以上", "1760px and up"),
            "3",
          ],
        ],
      ),
      h2(
        label(
          "ページ数に応じた表示",
          "As pages open",
        ),
      ),
      list(
        [
          label(
            "ページが1つの場合は、サイドバーの右側全体を使います。",
            "One page fills the space next to the sidebar.",
          ),
        ],
        [
          label(
            "2つの場合は、表示領域の幅を等分します。",
            "Two pages share it equally when both fit.",
          ),
        ],
        [
          label(
            "同時に表示できる数を超えてページを開くと、手前の列の幅を保ったまま、ページの表示領域が横にスクロールします。",
            "Once the strip reaches capacity, another page extends it horizontally.",
          ),
        ],
        [
          label(
            "表示領域の左右にある送りボタンで、1列ずつ移動できます。",
            "With the carousel installed, use its edge controls to move one column at a time.",
          ),
        ],
      ),
      para(
        label("このページから", "Open "),
        link("colors", label("色", "Colors")),
        label(
          "を開き、さらにページ内のリンクを選ぶと、列の動きを確認できます。",
          " and follow a link there to see how the strip grows.",
        ),
      ),
      h2(
        label(
          "2列分の幅を使うページ",
          "Double-width pages",
        ),
      ),
      para(
        label(
          "画面全体を紹介するページには、2列分の幅を使えます。",
          "A page showing an entire screen can request two columns of space. See ",
        ),
        link(
          "tpl-business",
          label(
            "業務アプリ",
            "Business application",
          ),
        ),
        label("がその例です。", "."),
      ),
      source(
        [
          "{ route, title, close, wide: true, body }",
          label(
            "// 2列分の幅を使用（表示領域の幅が上限）",
            "// Two columns, capped at the available width",
          ),
        ].join("\n"),
      ),
    ],
  };

  const sidebar: Page = {
    id: "sidebar",
    title: label("サイドバー", "Sidebar"),
    group: label("レイアウトの仕組み", "Layout"),
    wide: false,
    body: ({ link }) => [
      h1(label("サイドバー", "Sidebar")),
      para(
        label(
          "目次の項目をグループに分け、各行を罫線で区切ります。現在のページに対応する項目が強調されます。",
          "Group navigation rows under headings. Use current to mark the active page.",
        ),
      ),
      list(
        [
          label(
            "目次はグループごとに開閉できます。初期状態では、現在のページを含むグループだけが開いています。",
            "With toggle enabled, the group containing the current page starts open.",
          ),
        ],
        [
          label(
            "numbered を有効にすると、開閉できるグループ内の項目に01から順に番号が付きます。",
            "Enable numbered to count rows from 01 within each collapsible group.",
          ),
        ],
        [
          label(
            "製品名の右にあるボタンを押すと、サイドバーを折りたためます。折りたたみ状態は保存されます。",
            "The fold control sits beside the brand. The standalone catalog remembers its folded state.",
          ),
        ],
      ),
      para(
        label(
          "サイドバーだけを使うこともできます（",
          "To render just the navigation, use ",
        ),
        code("sidebarNav"),
        label(
          "）。画面全体の構成は、",
          ". For the complete frame, see ",
        ),
        link(
          "shell",
          label(
            "標準レイアウト",
            "The standard shell",
          ),
        ),
        label("を参照してください。", "."),
      ),
    ],
  };

  const tplBusiness: Page = {
    id: "tpl-business",
    title: label(
      "業務アプリ",
      "Business application",
    ),
    group: label("画面の例", "Screen examples"),
    wide: true,
    body: ({ link, assetBase }) => [
      h1(
        label(
          "業務アプリ",
          "Business application",
        ),
      ),
      para(
        label(
          "受託開発の管理を題材にした画面例です。メニュー、一覧、詳細、関連情報の順に、右隣の列にページが開きます。",
          "Explore a project management screen. Pick a menu item, open a record and follow a related item into the next column.",
        ),
      ),
      screen(
        assetBase + "demo1.html",
        label(
          "DevDesk — 業務メニュー",
          "DevDesk — project menu",
        ),
        label(
          "新しいタブで開く",
          "Open in a new tab",
        ),
      ),
      para(
        label(
          "たどったページの順序は「道筋」として URL に記録されます。途中の列でリンクを選ぶと、その右側の列が新しいリンク先に置き換わります。固定パネルを使う例は、",
          "The address records your trail through the data. Selecting a different item in an earlier column replaces the steps to its right. For an example with a pinned panel, see ",
        ),
        link(
          "tpl-workspace",
          label("ワークスペース", "Workspace"),
        ),
        label("を参照してください。", "."),
      ),
    ],
  };

  const tplWorkspace: Page = {
    id: "tpl-workspace",
    title: label("ワークスペース", "Workspace"),
    group: label("画面の例", "Screen examples"),
    wide: true,
    body: ({ link, assetBase }) => [
      h1(label("ワークスペース", "Workspace")),
      para(
        label(
          "左側に会話などの固定パネルを配置し、その右側でメニューと列をスクロールできる画面です。列が増えると、固定パネルは最小幅に達するまで狭くなります。",
          "The left panel stays in place while the menu and records scroll beside it. Opening more columns narrows the panel down to its minimum width.",
        ),
      ),
      screen(
        assetBase +
          "demo4.html?x=Lprojects.Sstorefront",
        label("ワークスペース", "Workspace"),
        label(
          "新しいタブで開く",
          "Open in a new tab",
        ),
      ),
      para(
        label(
          "workspaceWith で固定パネルと列を組み、resolveTrail に各列から進める項目を渡します。URL の道筋に無効な項目があれば、たどれる最後の列までを復元します。既存の画面に道筋や列幅の計算だけを加える場合は plggmatic/columns から読み込めます。",
          "Use workspaceWith for the frame and give resolveTrail a resolver for the steps each column offers. If a saved trail contains a stale step, the workspace restores the valid prefix. Import the trail and geometry helpers from plggmatic/columns to use them in an existing screen.",
        ),
      ),
      para(
        label(
          "メニューは細く折りたためます。一覧から詳細を開く操作は、",
          "Fold the menu into a rail and open a record. Compare the same navigation in the ",
        ),
        link(
          "tpl-business",
          label(
            "業務アプリ",
            "Business application",
          ),
        ),
        label("と同じです。", "."),
      ),
    ],
  };

  const tplForms: Page = {
    id: "tpl-forms",
    title: label("フォーム", "Forms"),
    group: label("画面の例", "Screen examples"),
    wide: true,
    body: ({ link, assetBase }) => [
      h1(label("フォーム", "Forms")),
      para(
        label(
          "FormField の配列を declaredForm に渡すと入力欄が並びます。送信時には同じ配列と入力値を parseForm に渡し、検証結果を各欄に戻します。",
          "Pass an array of FormField declarations to declaredForm to draw the fields. On submit, pass those same declarations and the draft values to parseForm, then show validation errors beside the affected fields.",
        ),
      ),
      para(
        label(
          "入力項目を宣言して組み立てたフォームです。入力内容の検証、ダイアログでの確認、トーストでの結果通知までを試せます。",
          "Try a form built from field declarations. Enter a value, check the validation message and confirm the action to see its result.",
        ),
      ),
      screen(
        assetBase + "forms.html",
        label("フォーム", "Forms"),
        label(
          "新しいタブで開く",
          "Open in a new tab",
        ),
      ),
      para(
        label(
          "この例では、",
          "This example combines ",
        ),
        link(
          "fields",
          label("入力欄", "Form fields"),
        ),
        label("、", ", "),
        link(
          "dialog",
          label(
            "ダイアログ",
            "Confirmation dialog",
          ),
        ),
        label("、", " and "),
        link(
          "toasts",
          label("トースト", "Toasts"),
        ),
        label("を使用しています。", "."),
      ),
    ],
  };

  /** The component sheets, family by family. */
  const sheets = componentPages(label);
  const byFamily: ReadonlyArray<Page> = [
    label(
      "コンポーネント：操作",
      "Components · Actions",
    ),
    label(
      "コンポーネント：入力",
      "Components · Input",
    ),
    label(
      "コンポーネント：表示",
      "Components · Display",
    ),
    label(
      "コンポーネント：通知",
      "Components · Feedback",
    ),
  ].flatMap((family: SoftStr) =>
    [
      buttons,
      links,
      theme,
      fields,
      properties,
      dialog,
      toasts,
      ...sheets,
    ].filter(
      (page: Page) => page.group === family,
    ),
  );

  /** Every page, in the order the sidebar lists them. */
  return [
    overview,
    ...gettingStarted(label),
    ...layoutChapter(label),
    share,
    sidebar,
    metrics,
    shellPage,
    looks,
    rules,
    colors,
    type,
    componentIndex(label),
    extending(label),
    ...byFamily,
    tplBusiness,
    tplWorkspace,
    tplForms,
    scheduledExample(label),
  ];
};
export const pages = makePages("ja");
const englishPages = makePages("en");
export const pagesFor = (locale: Locale) =>
  locale === "en" ? englishPages : pages;
