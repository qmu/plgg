# Option で省略できる値を扱う

副題の入力が任意なら、空欄からエラーを作る必要はありません。`fromNullable` は `null` と `undefined` を `None`、それ以外を `Some` にします。空文字列も値として残ります。表示するときだけ `getOr` で既定値を指定できます。

```ts
import { fromNullable, getOr, pipe } from "plgg";

const subtitle = (value: string | undefined) =>
  pipe(fromNullable(value), getOr("—"));

console.log(subtitle(undefined)); // —
```

## 空欄をどう読むか

副題を取得できた場合だけ前後の空白を除くなら `mapOption` を使います。変換後の値を `Some` に包むのは `mapOption` の役目です。変換そのものが「見つからない」を返せるなら `chainOption` を使います。ここを取り違えると `Option` の中にもう一つ `Option` ができます。

表示用の既定値は最後に決めます。先に空文字列へ置き換えると「副題の指定なし」と「空の副題を指定した」の区別が消えます。次の二つの呼び出しのうち、ダッシュが出るのは一つ目だけです。

```ts
import {
  fromNullable,
  getOr,
  mapOption,
  pipe,
} from "plgg";

const display = (raw?: string) =>
  pipe(
    fromNullable(raw),
    mapOption((s: string) => s.trim()),
    getOr("—"),
  );

console.log(
  display(),
  display("   "),
  display(" Atlas "),
);
```

## 不在がエラーになる境目

検索中は該当なしを `None` として扱えても、予約に進むには一冊を選ぶ必要があります。`okOr` に理由を渡すと、その時点で不在を失敗へ変えられます。逆向きの `toOption` は失敗理由を捨てます。画面に理由を出す場合は `Result` のまま渡します。

```ts
import { fromNullable, okOr, pipe } from "plgg";

const reserve = (id?: string) =>
  pipe(
    fromNullable(id),
    okOr("Choose a book first"),
  );

console.log(reserve(), reserve("A1"));
```
