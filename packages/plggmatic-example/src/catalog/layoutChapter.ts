import { type Label } from "./locale.ts";
import { type Page } from "./page.ts";
import {
  h1,
  h2,
  para,
  code,
  list,
  source,
  table,
} from "./parts.ts";

/**
 * THE LAYOUT SYSTEM — how a screen is put together and
 * how it behaves. None of it is a look: every skin draws
 * the same columns, opening the same way.
 */
export const layoutChapter = (
  label: Label,
): ReadonlyArray<Page> => {
  const chapter = label(
    "レイアウトの仕組み",
    "Layout",
  );

  const layoutRules: Page = {
    id: "layout",
    title: label(
      "レイアウトの基本",
      "Layout basics",
    ),
    group: chapter,
    wide: false,
    body: ({ link }) => [
      h1(
        label(
          "レイアウトの基本",
          "Layout basics",
        ),
      ),
      para(
        label(
          "plggmatic のレイアウトは、画面の構成とページを開閉したときの動作を定めています。色やフォントは",
          "A layout determines where pages go and how they open. Choose a ",
        ),
        link("looks", label("スキン", "skin")),
        label(
          "で変更できます。レイアウトの基本はすべてのスキンに共通です。",
          " to set colors and type across that layout.",
        ),
      ),
      para(
        label(
          "たとえば店舗一覧から店舗を選ぶと、一覧を左に残したまま、右に詳細を表示できます。別の店舗を選ぶと同じ位置の詳細が入れ替わります。読者は一覧に戻る操作をせずに、次の候補を選べます。",
          "In a store directory, picking a store opens its details beside the list. Pick another store in that same list and its details take the previous store’s place. The reader can compare candidates without navigating back to the directory.",
        ),
      ),
      h2(
        label(
          "画面構成と操作の原則",
          "How a screen works",
        ),
      ),
      list(
        [
          label(
            "画面を上下に分割せず、ページを横に並べます。関連項目：",
            "Arrange related pages side by side. See ",
          ),
          link(
            "column",
            label(
              "列の構成",
              "Anatomy of a column",
            ),
          ),
        ],
        [
          label(
            "リンク先は元のページを開いたまま、その右隣に表示します。関連項目：",
            "Keep the source visible when opening a destination. See ",
          ),
          link(
            "open",
            label(
              "右に開く",
              "Opening the next column",
            ),
          ),
        ],
        [
          label(
            "各列にはヘッダーと本文があり、本文は列ごとにスクロールできます。関連項目：",
            "Scroll within each page while its header stays in view. See ",
          ),
          link(
            "column",
            label(
              "列の構成",
              "Anatomy of a column",
            ),
          ),
        ],
        [
          label(
            "列幅は固定せず、開いているページの数に応じて配分します。関連項目：",
            "Share the available width between the open pages. See ",
          ),
          link(
            "share",
            label(
              "列幅と表示列数",
              "Sharing column width",
            ),
          ),
        ],
        [
          label(
            "狭い画面では、列の順序を保ったまま1列ずつ表示します。関連項目：",
            "Keep the same order on a phone and swipe between pages. See ",
          ),
          link(
            "narrow",
            label("狭い画面", "Narrow screens"),
          ),
        ],
        [
          label(
            "アニメーションで列の開閉などの変化を示します。関連項目：",
            "Follow changes in the strip through its transitions. See ",
          ),
          link(
            "motion",
            label("アニメーション", "Motion"),
          ),
        ],
        [
          label(
            "標準レイアウトを使う場合、レイアウト用の CSS は不要です。関連項目：",
            "Use the kit stylesheet for the standard frame. See ",
          ),
          link(
            "shell",
            label(
              "標準レイアウトの実装",
              "Using the shell",
            ),
          ),
        ],
      ),
      h2(
        label(
          "レイアウトとスキンの役割",
          "Layout and appearance",
        ),
      ),
      table(
        [
          label(
            "レイアウトの仕組み（変わらない）",
            "System",
          ),
          label(
            "スキン（差し替えられる）",
            "Skin",
          ),
        ],
        [
          [
            label(
              "列の並び、開く向き",
              "Order and direction of columns",
            ),
            label(
              "線の色、角の丸み",
              "Border color and corner radius",
            ),
          ],
          [
            label(
              "列の構成（ヘッダーと本文）",
              "Header and scrollable body",
            ),
            label(
              "文字の種類、大きさ",
              "Typefaces and sizes",
            ),
          ],
          [
            label(
              "列幅と表示する列数",
              "How columns share space",
            ),
            label(
              "強調表示の方法（白黒反転や背景色）",
              "How selections are marked",
            ),
          ],
          [
            label(
              "操作時の動き",
              "Which elements move",
            ),
            label(
              "アニメーションの速さ、影の濃さ",
              "Timing and shadows",
            ),
          ],
        ],
      ),
      h2(
        label(
          "コンポーネントの配置",
          "Where components go",
        ),
      ),
      para(
        label("ボタンや入力欄などの", "Place "),
        link(
          "components",
          label("コンポーネント", "components"),
        ),
        label(
          "は列の本文に配置します。列の位置や幅はレイアウトで決まります。",
          " such as buttons and fields in the body of a column.",
        ),
      ),
      h2(
        label(
          "列の中を組み立てる",
          "Compose the contents of a column",
        ),
      ),
      para(
        label(
          "row は子要素を横に、column は縦に並べます。pane は領域の役割を表します。たとえば mainPane は main 要素を返します。どれもスタイルの配列と子要素の配列を受け取ります。",
          "Use row to arrange children horizontally and column to stack them. A pane identifies the region’s role. For example, mainPane renders a main landmark. Each builder takes a list of style parts and a list of children.",
        ),
      ),
      source(
        'row([], [column([], [mainPane([], [text("Notes")])])])',
      ),
    ],
  };

  const columnPage: Page = {
    id: "column",
    title: label(
      "列の構成",
      "Anatomy of a column",
    ),
    group: chapter,
    wide: false,
    body: ({ link }) => [
      h1(
        label("列の構成", "Anatomy of a column"),
      ),
      para(
        label("画面の左端に", "The "),
        link(
          "sidebar",
          label("サイドバー", "sidebar"),
        ),
        label(
          "を配置し、その右に開いているページを順に表示します。",
          " sits at the left. The open pages follow it in order.",
        ),
      ),
      h2(
        label(
          "ヘッダーと本文",
          "Header and body",
        ),
      ),
      table(
        [
          label("領域", "Region"),
          label("内容", "Contents"),
          label("スクロール", "Scrolling"),
        ],
        [
          [
            label("ヘッダー", "Header"),
            label(
              "列のタイトル。右端の列には閉じるボタン（×）も表示",
              "Page title and an optional close link",
            ),
            label("固定", "Fixed"),
          ],
          [
            label("本文", "Body"),
            label(
              "ページの内容",
              "Page contents",
            ),
            label(
              "その列の中だけで縦にスクロールする",
              "Scrolls vertically within this column",
            ),
          ],
        ],
      ),
      para(
        label(
          "サイドバーも同じ構成です。ヘッダーに製品名、本文に目次を表示します。",
          "The sidebar follows the same pattern, with the brand above the navigation.",
        ),
      ),
      h2(label("スクロール", "Scrolling")),
      list(
        [
          label(
            "本文は列ごとに縦にスクロールできます。ある列をスクロールしても、隣の列の表示位置は変わりません。",
            "Scroll one page without moving the text in the next.",
          ),
        ],
        [
          label(
            "開いている列が画面に収まらない場合に限り、列の表示領域を横にスクロールできます（",
            "The strip scrolls horizontally when its columns no longer fit (see ",
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
            "画面全体のスクロールはありません。",
            "The frame stays in the viewport.",
          ),
        ],
      ),
      h2(label("閉じる", "Closing a page")),
      para(
        label(
          "閉じるボタン（×）は、右端の列のヘッダーにだけ表示します。列は右端から順に閉じます。最初のページは閉じられません。",
          "In the standard shell, supply a close link for the last page when two or more are open. Close pages from right to left.",
        ),
      ),
      h2(label("本文の幅", "Text width")),
      para(
        label(
          "文章は列幅にかかわらず、最大幅 48rem で折り返します。画面全体を紹介するページには、2列分の幅を指定できます（",
          "Prose wraps at a maximum width of 48rem. A page showing a complete screen can request two columns (",
        ),
        code("wide: true"),
        label("）。", ")."),
      ),
    ],
  };

  const openPage: Page = {
    id: "open",
    title: label(
      "右に開く",
      "Opening the next column",
    ),
    group: chapter,
    wide: false,
    body: ({ link }) => [
      h1(
        label(
          "右に開く",
          "Opening the next column",
        ),
      ),
      para(
        label(
          "ページ内のリンクを選ぶと、元のページを開いたまま、右隣の列にリンク先を表示します。次のリンクで試せます：",
          "Follow a link to keep the source page open and place its destination next to it. Try ",
        ),
        link(
          "column",
          label(
            "列の構成",
            "Anatomy of a column",
          ),
        ),
        label("。", "."),
      ),
      h2(label("列の表示順", "Reading order")),
      para(
        label(
          "先に開いたページほど左側に並びます。左隣の列を見ると、どのページから移動したかを確認できます。",
          "Look one column to the left to see the page that led you here.",
        ),
      ),
      h2(label("操作と列の変化", "Navigation")),
      table(
        [
          label("操作対象", "Action"),
          label("操作後の表示", "Result"),
        ],
        [
          [
            label(
              "ページの中のリンク",
              "Follow a link in a page",
            ),
            label(
              "右隣にリンク先が開きます。すでに列があれば入れ替わり、それより右の列は閉じます。",
              "Open its destination on the right and discard the previous columns beyond that point.",
            ),
          ],
          [
            label(
              "サイドバーの行",
              "Choose a sidebar item",
            ),
            label(
              "最初のページが切り替わり、右側の列はすべて閉じます。",
              "Replace the first page and close the rest.",
            ),
          ],
          [
            label(
              "右端の列の閉じるボタン",
              "Close the last column",
            ),
            label(
              "右端の列が閉じ、左隣の列が広がります。",
              "Remove the last page and give its space back to the remaining pages.",
            ),
          ],
          [
            label(
              "ブラウザの「戻る」",
              "Use the browser’s Back button",
            ),
            label(
              "直前の列の並びに戻ります。",
              "Restore the preceding strip.",
            ),
          ],
        ],
      ),
      h2(
        label(
          "現在の項目の強調表示",
          "Showing the current item",
        ),
      ),
      list(
        [
          label(
            "サイドバーでは、nav.current が選んだ項目を強調します。単独版のカタログでは、最後に開いた列がその対象です。",
            "The sidebar marks the item selected by nav.current. In the standalone catalog this is the last open page.",
          ),
        ],
        [
          label(
            "ページ内では、右隣の列を開いたリンクを強調します。",
            "A page can mark the link that opened the column next to it.",
          ),
        ],
      ),
      para(
        label(
          "強調する項目はレイアウトで決まります。白黒を反転するか、背景に色を付けるかは、",
          "The system identifies these states. Their appearance comes from the ",
        ),
        link("looks", label("スキン", "skin")),
        label("によって異なります。", "."),
      ),
      h2(
        label(
          "URL による列の復元と共有",
          "Sharing the strip",
        ),
      ),
      para(
        label(
          "URL を共有すると、同じ並びでページを開けます。単独版のカタログでは、次のようにページの識別子を並べます。",
          "Copy the address to reopen the same pages in the same order. The standalone catalog uses these query parameters:",
        ),
      ),
      source(
        [
          label(
            "?p=overview                  // 最初のページだけ",
            "?p=overview                  // First page only",
          ),
          label(
            "?p=overview&c=buttons        // 右に「ボタン」",
            "?p=overview&c=buttons        // Buttons on the right",
          ),
          label(
            "?p=overview&c=buttons,dialog // さらに右に「ダイアログ」",
            "?p=overview&c=buttons,dialog // Followed by Dialog",
          ),
        ].join("\n"),
      ),
    ],
  };

  const narrowPage: Page = {
    id: "narrow",
    title: label("狭い画面", "Narrow screens"),
    group: chapter,
    wide: false,
    body: ({ link }) => [
      h1(label("狭い画面", "Narrow screens")),
      para(
        label(
          "スマートフォンでも列の順序は同じです。画面幅に合わせて、サイドバーの開き方と一度に表示する列の数が変わります。",
          "The page order stays the same on a phone. Available width determines how the sidebar opens and how many pages fit.",
        ),
      ),
      table(
        [
          label("画面の幅", "Viewport"),
          label("サイドバー", "sidebar"),
          label("ページ", "Pages"),
        ],
        [
          [
            label("1024px 未満", "Below 1024px"),
            label(
              "左から引き出すメニュー",
              "Drawer on the left",
            ),
            label(
              "狭い画面では1列ずつ表示し、横スクロールで切り替え",
              "Swipe between pages",
            ),
          ],
          [
            label("1024px 以上", "1024px and up"),
            label(
              "左端に固定し、必要に応じて折りたたみ",
              "Pinned on the left, with a fold control",
            ),
            label(
              "表示領域の幅を各列に配分",
              "Columns share the available width",
            ),
          ],
        ],
      ),
      h2(
        label(
          "1024px 未満で変わること",
          "Below 1024px",
        ),
      ),
      list(
        [
          label(
            "画面上部にヘッダーが表示されます。左端にメニューボタン、その右に製品名が並びます。",
            "A bar appears above the strip with a menu button and the product name.",
          ),
        ],
        [
          label(
            "メニューボタンを押すと、サイドバーが左端から開きます。幅は 17rem で、画面幅の82%が上限です。外側の暗い部分を押すと閉じます。",
            "Open the menu to see a drawer up to 17rem wide, capped at 82% of the viewport. Tap its backdrop to close it.",
          ),
        ],
        [
          label(
            "960px 未満では各列が画面幅いっぱいに表示されます。横にスクロールすると、次の列の先頭で止まります。",
            "Below 960px each column fills the viewport, and the strip snaps to the next page as you scroll.",
          ),
        ],
        [
          label(
            "リンクを選ぶと、右隣に開いた列まで自動でスクロールします。",
            "The catalog brings a newly opened page into view.",
          ),
        ],
      ),
      para(
        label(
          "画面幅に応じた列数については、",
          "For the width rules, see ",
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

  const motionPage: Page = {
    id: "motion",
    title: label("アニメーション", "Motion"),
    group: chapter,
    wide: false,
    body: ({ link }) => [
      h1(label("アニメーション", "Motion")),
      para(
        label(
          "ページの開閉や切り替えをアニメーションで示します。操作に応じて、列幅やスクロール位置が次のように変わります。",
          "Column transitions help readers follow a change in position or width.",
        ),
      ),
      table(
        [
          label("操作", "Action"),
          label("表示の変化", "Change"),
        ],
        [
          [
            label("ページを開く", "Open a page"),
            label(
              "新しい列の幅がゼロから広がり、隣の列が狭くなります。",
              "The incoming column expands while neighboring pages give up space.",
            ),
          ],
          [
            label(
              "ページを閉じる",
              "Close a page",
            ),
            label(
              "閉じる列の幅がゼロまで縮み、隣の列が広がります。",
              "The outgoing column shrinks and the remaining pages expand.",
            ),
          ],
          [
            label(
              "同じ列でページを切り替える",
              "Replace a page in place",
            ),
            label(
              "列幅を保ったまま、表示内容だけが切り替わります。",
              "The content changes within the existing width.",
            ),
          ],
          [
            label(
              "サイドバーを折りたたむ",
              "Fold the sidebar",
            ),
            label(
              "サイドバーが細くなり、ページの表示領域が広がります。",
              "The sidebar narrows and the open pages gain room.",
            ),
          ],
          [
            label(
              "表示列数を超えてページを開く",
              "Open a page beyond capacity",
            ),
            label(
              "新しく開いた列まで横にスクロールします。",
              "The strip scrolls to the new column.",
            ),
          ],
        ],
      ),
      h2(
        label(
          "アニメーションの速さ",
          "Transition speed",
        ),
      ),
      para(
        label(
          "アニメーションの種類はレイアウトで決まり、速さは",
          "The system defines the movement and the ",
        ),
        link("looks", label("スキン", "skin")),
        label(
          "で設定します。既定のスキンでは短いアニメーションを使います。",
          " sets its timing. Monochrome uses short transitions.",
        ),
      ),
      h2(
        label(
          "動きを減らす設定",
          "Reduced motion",
        ),
      ),
      para(
        label(
          "OS で「視差効果を減らす」が有効な場合、列はアニメーションなしで開閉します。",
          "When the reader requests reduced motion, the layout suppresses animated transitions.",
        ),
      ),
    ],
  };
  return [
    layoutRules,
    columnPage,
    openPage,
    narrowPage,
    motionPage,
  ];
};
