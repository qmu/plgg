# リンクと原稿の項目を検証する

`plggpress build` は、本文の内部リンクをページ一覧と照合し、`#` に続く見出しがリンク先にあるかも確認します。`unknown route` が出たら元のページとリンク先のファイル名を、`unknown anchor` なら見出しを確認してください。先に検査を行うため、違反があれば新しいページの書き出しに進みません。

外部サイト、`/404`、拡張子付きの配布ファイルは存在検査の対象外です。下書きをページ一覧から外すには `srcExclude: ["/drafts/**"]`、拡張子のないダウンロードなどをリンク検査から外すには `linkIgnore` を使います。後者のパターンは `base` を含む出力先のリンクに合わせます。

## 同じ種類のページに必須項目を設ける

たとえば備品台帳の各ページに、品名と数量を必須とします。次のコードを設定ファイルに置き、デフォルトエクスポートの設定オブジェクトに `models` を加えます。`prefix` はルートの前方一致なので、ディレクトリを指定するときは末尾の `/` まで書きます。

```ts
import { bindModel, contentModel, numberField, textField } from "plggpress";

const models = [bindModel("/inventory/", contentModel("Stock", [
  textField("item"), numberField("quantity"),
  textField("location", false),
]))];
```

`inventory/pencils.md` の先頭に YAML を書きます。`location` は省略できます。`quantity` を文章に変えたり省略したりすると、ビルドは該当ページと理由を示して終了します。

```markdown
---
item: Pencils
quantity: 12
---

# Pencils
```

真偽値には `booleanField`、同じ型の値の配列には `listField`、ひとまとまりの項目には `groupField` を使います。モデルを指定した範囲だけが検査されます。[CLI の使い方](/cli/)も参照してください。
