# 型に足りない根拠を補う

JSON やフォームから受け取った値の型を unknown にすると、そのままでは題名を取り出せません。これは、受け取った値について確かめることが残っているという印です。文字列の検査には `typeof`、DOM 要素の種類には `instanceof`、タグと中身には対応する isX を使います。

## 検証と推論を切り分ける

データが未検証ならキャスターを通します。検証済みなのに高階関数の推論だけが足りないなら、コールバックの引数に型注釈を付けます。下の `Str` という注釈は、`asStr` が成功した時の値と照合されます。型アサーションで呼び出し側の値を言い換える必要はありません。

```ts
import {
  asStr,
  mapResult,
  pipe,
  type Str,
} from "plgg";

const length = (raw: unknown) =>
  pipe(
    asStr(raw),
    mapResult((s: Str) => s.content.length),
  );

console.log(length("Atlas"), length(17));
```

## ブラウザーの入力要素を絞る

`querySelector` の戻り値だけでは、要素があるか、入力欄かはわかりません。`instanceof` が成功した分岐では value を安全に読めます。フォームの外やサーバーでこの関数を呼ぶ必要はありません。下の spec は plgg-test の DOM 環境で実行します。

```ts
// @plgg-test-environment dom
import { none, some } from "plgg";
import { check, test, toEqual } from "plgg-test";

const read = (root: HTMLElement) => {
  const field = root.querySelector("input");
  return field instanceof HTMLInputElement
    ? some(field.value)
    : none();
};

test("reads a mounted input", () => {
  const field = document.createElement("input");
  field.value = "Atlas";
  document.body.appendChild(field);
  return check(
    read(document.body),
    toEqual(some("Atlas")),
  );
});
```
