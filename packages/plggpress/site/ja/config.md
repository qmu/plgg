# site.config.ts の設定項目

`site.config.ts` は設定オブジェクトをデフォルトエクスポートします。型を確認したい場合は `import type { SiteConfigInput } from "plggpress";` を使い、オブジェクトに `satisfies SiteConfigInput` を付けます。CLI は読み込み時にも各項目を検証します。

## 必須項目

| 項目 | 用途 |
| --- | --- |
| `title` | サイト名。サイドバーや本文のフッターに表示します。 |
| `description` | サイト全体の説明文。 |
| `base` | 公開するパス。ルートなら `/`、サブディレクトリなら `/en/` など。 |
| `nav` | `{ text, link }` の配列。このテーマの目次には `sidebar` を使います。 |
| `sidebar` | `{ text, items }` の配列。子項目は `{ text, link?, items }`。 |
| `social` | `{ icon, link }` の配列。リンクを表示しない場合は `[]`。 |
| `dev` | `{ allowedHosts: [] }` の形。追加ホスト名を指定する設定値です。 |

## 目次と外観

| 項目 | 用途 |
| --- | --- |
| `sidebarStyle` | `plain`（既定）、`tree`、`numbered`。章を別の列に開くか、ツリーで表示するかを選びます。 |
| `sidebarGroups` | ツリーの章は `open`（既定）で展開、`toggle` で開閉できます。 |
| `controls` | 操作ボタンの位置。`rail`（既定）は右端、`sidebar` は目次の下です。 |
| `contentWidth` | 本文幅は `measure`（既定）。`fill` は残り幅を列で分け合います。 |
| `tagline` | サイドバーに添える短い紹介文。 |
| `footerLink` | サイドバー下部のリンクを `{ text, link }` で指定します。 |
| `theme` | `light` と `dark` それぞれの色トークンに 16 進カラーを設定したパレット。 |
| `appearance` | plggmatic のスキン。省略時は `monochrome`。 |

## 原稿と検証

| 項目 | 用途 |
| --- | --- |
| `slugger` | 見出し ID の生成規則。`vitepress`（既定）か `github`。 |
| `rawHtml` | `true` で認識された HTML をそのまま出力します。信頼できる原稿に使います。既定ではエスケープします。 |
| `models` | `{ prefix, model }` の配列。該当ページの frontmatter を検証します。 |
| `srcExclude` | ビルドから除くルートのパターンの配列。 |
| `linkIgnore` | リンク検査から除くリンク先のパターンの配列。 |

パターンの `*` は同じ階層内の任意の文字列、`**` は `/` をまたぐ文字列、`?` は `/` 以外の 1 文字に一致します。[リンクとモデルの検証](/checks/)に記入例があります。

## サイト間の許可

| 項目 | 用途 |
| --- | --- |
| `partners` | 列として開ける相手のオリジンの配列。 |
| `embedders` | 自サイトを列として開ける相手のオリジンの配列。 |
| `frames` | ほかにフレームで読み込むオリジンの配列。 |

[サイトをつなぐ](/joining/)で、リンクを置く側と開かれる側の設定を確認できます。
