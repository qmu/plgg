# 判定や変換の手続きを値として渡す

キャスターが一つ必要なだけなら `asStr` を直接渡せます。いくつもの型について同じ手続きを書きたいときは、必要な操作を持つオブジェクトを受け取る方法もあります。`Refinable` の is は型ガード、`Castable` の as は `Result` を返す検証関数です。どちらも対象となるデータそのものにはメソッドを足しません。

## 型を保ったまま絞り込む

次の関数は判定できることだけを要求します。`strRefinable` を渡すと、戻り値の要素は `Str` に決まります。生の文字列を `Str` に変換する処理は行わないため、一件だけが残ります。変換まで必要なら `strCastable` を使います。

```ts
import {
  box,
  strCastable,
  strRefinable,
  type Refinable,
} from "plgg";

const select =
  <T>(rule: Refinable<T>) =>
  (values: readonly unknown[]) =>
    values.filter(rule.is);

console.log(
  select(strRefinable)([
    "Atlas",
    box("Str")("Maps"),
  ]),
);
console.log(strCastable.as("Atlas").__tag);
```

## 比較の規則を差し替える

たとえば蔵書を題名の長さで並べたいとします。比較する側は `Comparable` の compare だけを知っていればよく、題名に新しいメソッドは必要ありません。結果は -1、0、1 の三通りです。長さが同じ本をどう並べるかは、この規則では区別していません。

```ts
import type { Comparable } from "plgg";

const byLength: Comparable<string> = {
  compare: (a, b) =>
    a.length === b.length
      ? 0
      : a.length < b.length
        ? -1
        : 1,
};
console.log(
  ["Atlas", "Map"].toSorted(byLength.compare),
);
```
