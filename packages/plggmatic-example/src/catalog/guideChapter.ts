import type { Page } from "./page.ts";
import type { Label } from "./locale.ts";
import {
  h1,
  h2,
  para,
  source,
  screen,
} from "./parts.ts";

export const gettingStarted = (
  label: Label,
): ReadonlyArray<Page> => {
  const group = label(
    "はじめに",
    "Getting started",
  );
  const startTitle = label(
    "インストールと動作確認",
    "Install and run the catalog",
  );
  const firstTitle = label(
    "最初の画面を作る",
    "Build your first screen",
  );
  return [
    {
      id: "start",
      title: startTitle,
      group,
      wide: false,
      body: ({ link }) => [
        h1(startTitle),
        para(
          label(
            "Node.js と npm を使います。リポジトリを取得して、ルートで次のスクリプトを実行してください。依存パッケージが未導入ならインストールし、ライブラリを順番にビルドします。",
            "Start with Node.js and npm. From a fresh checkout, run the workspace build script. It installs missing workspace dependencies and builds the libraries in dependency order.",
          ),
        ),
        source(
          "git clone https://github.com/qmu/plgg.git\ncd plgg\nsh scripts/build.sh",
        ),
        h2(
          label(
            "カタログを開く",
            "Open the catalog",
          ),
        ),
        source(
          "cd packages/plggmatic-example\nnpm run build\nnpm run preview",
        ),
        para(
          label(
            "プレビューには Python 3 を使います。http://localhost:8000/ を開き、「ボタン」の見本を押して回数が増えることを確かめます。Ctrl+C で終了できます。",
            "The preview uses Python 3. Open http://localhost:8000/, choose the buttons page and press a sample button to see its count increase. Press Ctrl+C in the terminal to stop the server.",
          ),
        ),
        para(link("first-screen", firstTitle)),
      ],
    },
    {
      id: "first-screen",
      title: firstTitle,
      group,
      wide: false,
      body: ({ link }) => [
        h1(firstTitle),
        para(
          label(
            "ビルド済みのリポジトリのルートに手元の例を作ります。次の内容を first.ts に保存してください。左に目次、右にノートが1枚ある画面です。",
            "Work at the root of the built checkout. Save the following browser entry as first.ts. It draws a notebook with a contents link on the left and one open page on the right.",
          ),
        ),
        source(
          [
            'import { none, some } from "plgg";',
            'import { onClick, text } from "plgg-view";',
            'import { sandbox, cmdNone } from "plgg-view/client";',
            'import { shell, kitCss } from "plggmatic";',
            'import { defaultTheme } from "plggmatic/style";',
            "",
            'const style = document.createElement("style");',
            "style.textContent = kitCss(defaultTheme);",
            "document.head.appendChild(style);",
            'const home = "./first.html";',
            'const item = { label: "Notes", href: some(home), children: [] };',
            'sandbox<boolean, "fold">({',
            "  init: [false, cmdNone()],",
            "  update: (_, folded) => [!folded, cmdNone()],",
            "  view: folded => shell({",
            '    brand: "Notebook", home, atHome: true,',
            '    nav: { groups: [{ label: "Library", items: [item] }],',
            "      resolve: path => path, current: path => path === home,",
            '      toggle: true, numbered: false, label: "Contents" },',
            '    folded, fold: [onClick("fold")], foot: [], drawer: none(),',
            '    pages: [{ route: home, title: "Notes", close: none(),',
            '      wide: false, body: [text("My first note")] }],',
            "  }),",
            "})(document.body);",
          ].join("\n"),
        ),
        h2(
          label(
            "ブラウザーで確かめる",
            "Try it in the browser",
          ),
        ),
        para(
          label(
            "同じ場所に first.html を作り、次の HTML を保存します。",
            "Save this HTML beside the entry as first.html.",
          ),
        ),
        source(
          '<!doctype html>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Notebook</title>\n<body><script type="module" src="./first.js"></script></body>',
        ),
        source(
          "npx esbuild first.ts --bundle --format=esm --outfile=first.js\npython3 -m http.server 8000",
        ),
        para(
          label(
            "http://localhost:8000/first.html を開きます。広い画面では製品名の隣のボタンを押すと目次が細くなり、ノートの幅が広がります。次は、",
            "Open http://localhost:8000/first.html. On a wide screen, fold the sidebar using the button beside Notebook. The note gains the space the sidebar releases. Next, read ",
          ),
          link(
            "shell",
            label(
              "標準レイアウトの実装",
              "Using the shell",
            ),
          ),
          label(
            "で2枚目のページの渡し方を確認します。",
            " to add a second page.",
          ),
        ),
      ],
    },
  ];
};

export const extending = (label: Label): Page => {
  const title = label(
    "共通の部品を追加する",
    "Adding a shared component",
  );
  return {
    id: "adding-components",
    title,
    group: label("コンポーネント", "Components"),
    wide: false,
    body: ({ link }) => [
      h1(title),
      para(
        label(
          "たとえば店舗の設定で「営業中」を切り替えるなら、",
          "For an opening-hours setting, start with the ",
        ),
        link(
          "properties",
          label("設定項目", "property list"),
        ),
        label(
          "の toggle を使います。店舗名や現在の値、変更時の処理はアプリから渡します。同じ操作は別の画面でも同じ部品で表せます。",
          " and its toggle. Pass the store’s label, current value and change message from the application. Another settings screen can use the same control with its own data.",
        ),
      ),
      h2(
        label(
          "必要な操作が見つからないとき",
          "When the catalog has no matching control",
        ),
      ),
      para(
        label(
          "画面ごとに専用の CSS クラスを足すと、同じ操作の見た目や使い方が画面によって変わります。足りない部品は plggmatic に追加し、役割を利用先に依存しない言葉で決めます。たとえば「店舗の編集ボタン」なら、部品が受け取るのは店舗データではなく、ラベル、無効状態、押したときのメッセージです。",
          "A CSS class used on just one screen can make the same action look or behave differently elsewhere. Put the missing control in plggmatic and describe its role in terms that apply across screens. An edit button needs a label, a disabled state and a message to send when pressed. The screen can keep the store record in its own model.",
        ),
      ),
      para(
        label(
          "新しい部品は packages/plggmatic/src/Component に、props から Html<Msg> を返す関数として追加します。構造と操作に必要な CSS はシステム側に、線や色、余白はスキン側に置きます。部品名や CSS クラスを使う側で書き直さずに済むよう、必要な関数やフックをパッケージの公開 API からエクスポートします。",
          "Add the component under packages/plggmatic/src/Component as a function from props to Html<Msg>. Put structural rules in the system stylesheet and visual rules in the appearance stylesheet. Export the component and any public hooks from the package so callers can import them.",
        ),
      ),
      para(
        label(
          "部品のテストでラベル、状態、操作を確認します。最後にカタログへ日英の説明と操作できる見本を加え、両方のスキンで確かめます。利用する画面はこの公開部品を呼び出します。",
          "Test the label, states and actions. Add a catalog page with instructions in both languages and a working example, then try it in both skins. Screens can now import the same component.",
        ),
      ),
    ],
  };
};

export const scheduledExample = (
  label: Label,
): Page => {
  const title = label(
    "宣言から一覧と詳細を作る",
    "Build a list and detail view from a declaration",
  );
  return {
    id: "declarations",
    title,
    group: label("画面の例", "Screen examples"),
    wide: true,
    body: ({ assetBase }) => [
      h1(title),
      para(
        label(
          "一覧の検索欄に語句を入れ、残った行を選んで詳細を開いてください。別タブで試すと、検索語や選択が URL に反映される様子を確認できます。",
          "Enter a search term and open a matching record. Open the example in its own tab to watch the address change with the query and selection.",
        ),
      ),
      screen(
        assetBase + "demo3.html",
        label("標本の検索", "Specimen search"),
        label(
          "新しいタブで開く",
          "Open in a new tab",
        ),
      ),
      h2(
        label(
          "データと描画をつなぐ",
          "Connect data to a renderer",
        ),
      ),
      para(
        label(
          "declare にメニューと collection を渡します。各 collection は source でデータを読み、toRow で識別子や表示名を取り出します。query を指定すると検索欄が付き、child を指定すると選択した項目から次の一覧へ進めます。",
          "Pass a menu and collections to declare. A collection reads records through its source and uses toRow to give each one an ID and label. Add a query for filtering or a child collection to drill down from a selected row.",
        ),
      ),
      source(
        [
          'import { declare, menu, menuEntry, collection, makeRow, sync, query, schedule, multiColumn } from "plggmatic";',
          'import { application } from "plgg-view/client";',
          "",
          "const declaration = declare({",
          '  title: "Field Notes",',
          '  menu: menu([menuEntry("Plants", "plants")]),',
          "  collections: [collection<string>({",
          '    id: "plants", title: "Plants",',
          '    source: sync(() => ["Fern", "Moss"]),',
          "    toRow: name => makeRow(name, name),",
          '    query: query("Filter plants"),',
          "  })],",
          "});",
          "const program = schedule(declaration);",
          "application({",
          "  ...program,",
          "  view: model => multiColumn(program.scene(model)),",
          "})(document.body);",
        ].join("\n"),
      ),
      para(
        label(
          "schedule は初期状態、更新処理、URL との変換、描画用の scene を組み立てます。同じ scene を renderMode で単列にも複数列にも描けます。画面のモードをアプリで別に持てば、表示を切り替えても検索語や選択を引き継げます。",
          "schedule derives initialization, updates, URL handling and a scene to draw. renderMode can display that scene in one column or several. Keep the mode alongside the scheduled model to retain the query and selection when switching views.",
        ),
      ),
      h2(
        label(
          "データの取得と操作",
          "Loading and changing records",
        ),
      ),
      para(
        label(
          "手元の配列は sync、通信を伴う読み込みは async で渡します。外部から行を供給する場合は dynamic と withRows を使います。複数のコレクションで同じバックエンドを使う場合は、ホストに登録した adapter を指定できます。",
          "Use sync for an in-memory list or async for a deferred read. Use dynamic with withRows when the host supplies updated rows. Collections that share a backend can use an adapter registered by the host.",
        ),
      ),
      para(
        label(
          "Field Notes ではセクションを選び、ノートを開けます。actions で作成・更新・削除を宣言し、confirm で確認の文言を指定できます。別の一覧への入口をタイルで並べるには、collection の board を有効にします。",
          "In Field Notes, choose a section and open a note. Declare create, update or delete operations in actions and supply confirmation text with confirm. To present navigation tiles, enable board on a collection.",
        ),
      ),
      screen(
        assetBase + "reference.html",
        "Field Notes",
        label(
          "新しいタブで開く",
          "Open in a new tab",
        ),
      ),
      h2(
        label(
          "画面から操作できることを取り出す",
          "Expose the actions available in a scene",
        ),
      ),
      para(
        label(
          "catalogOf(scene) は、その時点で開いているメニュー、一覧、詳細などに対応するツールを返します。複数の操作を記述したフローは readFlow で検査できます。runFlow は取り消せない操作の確認に達すると停止し、呼び出し側の確認を待ちます。",
          "catalogOf(scene) returns tools for the menu, lists and details currently open. Use readFlow to check a script that combines several operations. When runFlow reaches a destructive action requiring confirmation, it returns the prompt for the caller to handle.",
        ),
      ),
    ],
  };
};
