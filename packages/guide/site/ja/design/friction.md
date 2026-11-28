# 型と境界でつまずいたら

## 検証済みなのに引数が unknown になる

`const show = matchOption(() => "—", s => s.trim())` では s の型が決まりません。後から `pipe(value, show)` と書いても、別の式で作った show の引数まで推論は戻りません。空の場合と値がある場合で戻り値をそろえ、値を受ける枝に引数の型を書きます。注釈を付けた関数は pipe に渡すときにも検査されます。数値の Option には使えません。

```ts
import {
  fromNullable,
  matchOption,
  pipe,
} from "plgg";

const show = matchOption(
  (): string => "—",
  (s: string): string => s.trim(),
);
console.log(pipe(fromNullable(" Atlas "), show));
```

## 外部の関数が失敗する場所を二つに分ける

`JSON.parse(raw).trim()` は、壊れた JSON でも、正しく読めた数値でも例外になります。tryCatch で外部関数の例外を捕まえても、成功値の形までは決まりません。下では成功値を unknown で受け、文字列として使えるかを asStr に判定させます。順に試すと、構文の誤りは Defect、数値は InvalidError になります。

```ts
import { asStr, proc, tryCatch } from "plgg";

const parse = tryCatch((s: string): unknown =>
  JSON.parse(s),
);
const read = (s: string) => proc(s, parse, asStr);
console.log(await read("{"), await read("42"));
```

## 成功の箱を重ねてしまう

`mapOption(first)(some(""))` の外側は Some です。first 自身が Option を返すので、中には None が入っています。呼び出し側に必要なのが「先頭の文字があるか」だけなら chainOption で一段にします。Result を返す検証に mapResult を使って Ok(Err(...)) になったときも同じで、chainResult を使います。

```ts
import {
  chainOption,
  fromNullable,
  mapOption,
  some,
} from "plgg";

const first = (s: string) => fromNullable(s[0]);
console.log(
  mapOption(first)(some("")),
  chainOption(first)(some("")),
);
```

一方、検索結果が `Result<Option<Book>, DbError>` なら、検索失敗と該当なしは別の出来事です。先に Result の失敗を処理し、成功した枝でだけ Option を開きます。先に toOption で理由を捨てると、DB 障害まで「蔵書なし」と表示してしまいます。

## 非同期の途中で HTTP の応答を決めてしまう

`read(raw).then(book => save(book))` の book は検証済みの本ではなく Result です。Promise の then が開くのは Promise だけです。proc に検証と保存を順に渡すと、Err の後で保存を呼びません。外部ライブラリが返す Promise の拒否は、その呼び出しを tryCatch で包んで受けます。

```ts
import {
  asStr,
  mapErr,
  proc,
  tryCatch,
  type Defect,
  type InvalidError,
  type Str,
} from "plgg";

const save = tryCatch(async (title: Str) =>
  Promise.resolve(title.content.length),
);
const register = (raw: unknown) =>
  proc(raw, asStr, save);
const respond = async (raw: unknown) =>
  mapErr((e: InvalidError | Defect) =>
    e.__tag === "InvalidError" ? 400 : 500,
  )(await register(raw));
console.log(
  await respond(""),
  await respond("Atlas"),
);
```

`(await register(raw)).content.message` は読めません。成功時には中身が数値で、失敗側にも各段の理由と Defect が残ります。段を加えるたびに呼び出し側に同じ分岐を書くと、理由が増えるたびに直す場所も増えます。上の例では HTTP に返す段で一度だけ mapErr を使い、入力不備を 400、それ以外を 500 と決めています。個別に再試行する処理があるなら、その判断が済むまで元の理由を残します。エラー型の和はコミット `c9ecc6e2` と `Flowables/proc.spec.ts` の型検査で確認できます。
