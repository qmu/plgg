# cast で入力の項目を検証する

入力を `unknown` として受け、`asObj` でオブジェクトを確認してから `forProp` で各項目を検証します。成功時には `title` が空でない文字列を包む `Str` になり、`copies` は `Num` になります。`title` を `""`、`copies` を `"2"` に変えると、両方の失敗が `InvalidError` の `content.sibling` に入ります。

```ts
import {
  asNum,
  asObj,
  asStr,
  cast,
  forProp,
} from "plgg";

const readBook = (input: unknown) =>
  cast(
    input,
    asObj,
    forProp("title", asStr),
    forProp("copies", asNum),
  );

console.log(
  readBook({ title: "Field notes", copies: 2 }),
);
```

## 必須項目と任意項目を分ける

`forProp` はキーがなければ失敗し、値があれば指定したキャスターに渡します。`forOptionProp` はキーがなければ `None` を補い、あれば検証して `Some` に包みます。`null` を明示した場合も「キーがある」側です。外部の JSON で副題が未定ならキーごと省きます。

`cast` の各段階には副作用のない検証関数を渡してください。一度失敗しても、別の不備を拾うため後続の関数が元の入力で呼ばれます。DB への登録は検証が全部済んだ後です。

```ts
import {
  asObj,
  asStr,
  cast,
  forOptionProp,
} from "plgg";

const subtitle = (input: unknown) =>
  cast(
    input,
    asObj,
    forOptionProp("subtitle", asStr),
  );

console.log(
  subtitle({}),
  subtitle({ subtitle: "North" }),
);
console.log(subtitle({ subtitle: null }).__tag); // Err
```

## 生の文字列と Str を見分ける

`isStr` は値を変換しません。フォームから来た文字列は中身が正しくても、このガードだけでは通りません。外部入力を受ける関数には `asStr`、既に型が付いているかどうかで分岐する関数には `isStr` を使います。`refine` は受け取った型を保ったまま条件を足します。キャスターを一つ足すたびに、正しい入力と、その条件だけを破る入力を一つずつ試すと、どの条件で失敗したかを切り分けられます。

```ts
import {
  asStr,
  cast,
  isStr,
  refine,
  type Str,
} from "plgg";

const short = (v: unknown) =>
  cast(
    v,
    asStr,
    refine(
      (s: Str) => s.content.length < 4,
      "Too long",
    ),
  );

console.log(
  isStr("Map"),
  short("Map").__tag,
  short("Atlas").__tag,
);
```
