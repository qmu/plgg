# 値の持ち方を決める理由

## 本の値と改題の操作を分ける

クラスなら `book.rename(title)` と書けて、補完から操作を探せます。一方、JSON から読んだ本にはそのメソッドがありません。plgg の規約ではデータと操作を分けます。テストでは本の値だけ用意すれば改題を試せます。その代わり、使う関数の名前とインポート先を知る必要があります。 これはドメインの値を定義するときの規約です。本体の Result には、Ok と Err を絞り込む isOk・isErr メソッドもあります。

`rename(book, title)` は本を先に受け取ります。題名を先に受け取れば、「Atlas に改題する」という関数を一度作り、本が届く段にそのまま渡せます。引数の順が違う JS ライブラリには短いラッパーが要ります。

```ts
import { pipe } from "plgg";

type Book = Readonly<{ title: string }>;
const rename =
  (title: string) =>
  (book: Book): Book => ({ ...book, title });
const atlas = rename("Atlas");
console.log(pipe({ title: "Draft" }, atlas));
```

## 副題の省略と題名の誤りを分ける

副題が省略されたとき、`raw ? raw : "—"` では空文字列までダッシュになります。fromNullable は null と undefined だけを None にします。表示まで空文字列との区別を保てますが、通常の JS に渡すときは箱を開きます。もとの null と undefined の違いも消えるので、両者に別の意味がある入力では変換前に判定します。

```ts
import { fromNullable, getOr, pipe } from "plgg";

const display = (raw?: string) =>
  pipe(fromNullable(raw), getOr("—"));
console.log(display(), display(""));
```

必須の題名が空なら、今度は理由を返したいところです。`throw new Error("empty title")` では、関数の戻り値の型から失敗は読み取れません。asStr の結果には成功値と検証エラーの両方が現れます。表示側が理由を使える反面、文字数を数えるだけでも成功側を取り出す必要があります。

```ts
import {
  asStr,
  mapResult,
  pipe,
  type Str,
} from "plgg";

const size = (raw: unknown) =>
  pipe(
    asStr(raw),
    mapResult((s: Str) => s.content.length),
  );
console.log(size("Atlas"), size(""));
```

## 同じ文字列でも取り違えたくないもの

`type BookId = string` と書いても、著者 ID を渡せてしまいます。Box のタグを分ければ、どちらも中身は文字列のまま、取り違えを型検査で見つけられます。タグは実行時にも残ります。文字列を要求する既存の API に渡すときは中身を取り出します。タグを付けるだけでは空文字列を排除できません。

```ts
import { box, type Box } from "plgg";

const shelfKey = (id: Box<"BookId", string>) =>
  "shelf/" + id.content;
console.log(shelfKey(box("BookId")("17")));
```

## 型を約束する前に、値を確かめる

外部から受けた値に `raw as string` と書いても、数値は文字列になりません。any は後続の検査まで素通りさせ、ts-ignore はその行で契約が破れたことを隠します。CLAUDE.md は型エラーをこの三つで消すことを禁じています。上の size のように unknown をキャスターに渡せば、検証を通った後の処理では同じ条件を確かめ直さずに済みます。入力形式ごとに検査を書く手間と、失敗を返す経路は必要です。検証済みなら、足りないものが[型注釈](/design/friction/)だけの場合もあります。

規約の出典は `.claude/skills/plgg-coding-style/SKILL.md` と `.workaholic/constraints/quality.md` です。補完での探しやすさやラッパーを書く手間は、規約ができた経緯ではなく、現在の呼び出し方から読み取った得失です。
