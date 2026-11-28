# 項目名が決まったデータと辞書

本には title と copies という決まった項目があり、それぞれ検証方法が違います。この場合は `Obj` に `forProp` を重ねます。一方、蔵書番号をキーにして題名を引く辞書では、キーの種類が増えても全ての値に同じ条件を適用します。`asDictOf` に値のキャスターを一つ渡せば済みます。

## 入力の失敗を読む

`asDictOf` は配列を拒み、値が不正なら最初に失敗したキーをメッセージに含めます。順序で意味が決まる本の一覧は `asVecOf` で読みます。辞書の検証が成功しても、欲しい番号が登録済みとは限りません。キーで引いた結果は `fromNullable` に渡して不在を表現できます。

```ts
import { asDictOf, asStr, asVecOf } from "plgg";

const catalog = asDictOf(asStr);
console.log(
  catalog({ A1: "Atlas", B2: "" }).__tag,
);
console.log(
  asVecOf(asStr)(["Atlas", "Maps"]).__tag,
);
```

## 配列を検証してから変換する

配列であることを確かめるだけでは、各要素に文字列の操作を適用できません。`asVecOf`(`asStr`) は要素を一件ずつ読み、最初の不正な要素の位置を説明に含めます。一件もない一覧は正しい配列です。最低一件という条件が必要なら検証をもう一段加えます。

```ts
import { asStr, asVecOf, isErr } from "plgg";

const titles = asVecOf(asStr);
const invalid = titles(["Atlas", 42]);
if (isErr(invalid))
  console.log(invalid.content.content.message);
console.log(titles([]).__tag);
```
