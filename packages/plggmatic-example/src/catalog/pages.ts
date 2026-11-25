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
  type Ctx,
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

/**
 * One page of the catalog. `wide` asks for two columns'
 * worth — a page that shows a whole screen.
 */
export type Page = Readonly<{
  id: SoftStr;
  title: SoftStr;
  group: SoftStr;
  wide: boolean;
  body: (ctx: Ctx) => ReadonlyArray<Node>;
}>;

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
      link("rules", "画面のきまり"),
      " か ",
      link("buttons", "ボタン"),
      " を押してみてください。",
    ),
    h2("何が入っているか"),
    list(
      [
        link("shell", "標準の画面"),
        " — サイドバーと、幅を分け合うページの列",
      ],
      [
        link("colors", "色"),
        "・",
        link("type", "文字"),
        "・",
        link("metrics", "寸法"),
        " — 見た目の土台",
      ],
      [
        link("buttons", "ボタン"),
        "・",
        link("fields", "入力欄"),
        "・",
        link("dialog", "ダイアログ"),
        "・",
        link("toasts", "トースト"),
        " — 部品",
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
  title: "画面のきまり",
  group: "はじめに",
  wide: false,
  body: ({ link }) => [
    h1("画面のきまり"),
    para(
      "plggmatic で作った画面が、どれも同じ家族に見えるための決まりです。",
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
      "いま居る場所（サイドバーの行、右の列を開いたリンク）は、文字と背景を入れ替えて示します。マウスを乗せたときも同じです。色のアクセントは使いません。",
    ),
    h2("どの列も同じ作り"),
    para(
      "サイドバーもページも、上に名前の帯、その下に自分でスクロールする本文、という同じ作りです。",
    ),
    h2("動きは、何が変わったかを言う"),
    list(
      [
        "ページが開くとき：幅 0 から広がり、隣が場所をゆずります。",
      ],
      ["ページを閉じるとき：その逆です。"],
      [
        "同じ場所で入れ替えるとき：幅は動かず、中身だけがふわっと出ます。",
      ],
    ),
    para(
      "列の幅の決まりは ",
      link("share", "列を分け合う"),
      " にあります。",
    ),
  ],
};

const colors: Page = {
  id: "colors",
  title: "色",
  group: "基礎",
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
  group: "基礎",
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
  group: "基礎",
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
  group: "部品",
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
  group: "部品",
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

const dialog: Page = {
  id: "dialog",
  title: "ダイアログ",
  group: "部品",
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
  group: "部品",
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
  group: "部品",
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
  group: "部品",
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
  title: "標準の画面",
  group: "レイアウト",
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
        "    numbered: true,      // 01, 02, … と数える",
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
      link("rules", "画面のきまり"),
      " にあります。",
    ),
  ],
};

const share: Page = {
  id: "share",
  title: "列を分け合う",
  group: "レイアウト",
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
  group: "レイアウト",
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
  rules,
  colors,
  type,
  metrics,
  buttons,
  fields,
  dialog,
  toasts,
  links,
  theme,
  shellPage,
  share,
  sidebar,
  tplBusiness,
  tplWorkspace,
  tplForms,
];
