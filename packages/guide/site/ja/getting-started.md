# 最初のプログラムを動かす

本の題名を入力として受け取ってみましょう。Node.js と npm のあるプロジェクトで `npm install plgg` を実行し、次のコードを `title.mjs` に保存します。

```js
import { asStr, isOk } from "plgg";

const title = asStr(process.argv[2]);
if (isOk(title)) {
  console.log(title.content.content);
} else {
  console.log(title.content.content.message);
}
```

`node title.mjs Atlas` を実行すると `Atlas` が表示されます。引数を省くと、代わりに検証エラーの説明が表示されます。成功時には、最初の `content` で `Ok` から `Str` を、次の `content` で文字列を取り出しています。

## リポジトリの例を試す

複数のパッケージを一緒に使う例は、npm ワークスペースで動かせます。次のスクリプトが依存関係を準備し、各パッケージを順にビルドします。ビルドが終わったら [To-Do アプリ](/packages/example/)を動かしてみましょう。

```sh
git clone https://github.com/qmu/plgg.git
cd plgg
sh scripts/build.sh
```

## 入力を変えてから次へ

引数を `""` に変えると、文字列でも長さがゼロなので失敗します。`" "` は長さが一つなので成功します。空白だけの題名も拒みたい場合は、プログラムが求める条件を別に定義します。次の[本棚のチュートリアル](/tutorial/)では、その条件をフォームや保存先に散らさず、一つのキャスターにまとめます。
