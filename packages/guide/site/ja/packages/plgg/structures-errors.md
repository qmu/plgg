# 構造とエラーを調べる

同じ型の要素が並ぶ配列には `asVecOf`、項目名が決まっているレコードには `asObj` と `forProp` を使います。[書籍の検証例](/concepts/validation/)のように、項目ごとに異なる検証関数を指定できます。

失敗した `Result` から `InvalidError` を取り出すと、`content.message` に説明があり、`content.sibling` には一緒に報告されたエラーが並びます。`printPlggError` で関連するエラーも含めてコンソールに表示できます。

## まとめて返ったエラーを読む

一項目だけ失敗した場合、説明はそのエラー自身にあります。複数の検証に失敗した場合は sibling に個別のエラーが並びます。下の例で二つの値をそれぞれ正しい値に戻すと、違いを確かめられます。

```ts
import {
  asNum,
  asObj,
  asStr,
  cast,
  forProp,
  isErr,
} from "plgg";

const r = cast(
  { title: "", copies: "2" },
  asObj,
  forProp("title", asStr),
  forProp("copies", asNum),
);
if (isErr(r))
  console.log(
    r.content.content.message,
    r.content.content.sibling.map(
      (e) => e.content.message,
    ),
  );
```
