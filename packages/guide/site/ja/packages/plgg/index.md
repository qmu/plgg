# plgg の関数を選ぶ

入力の検証には `cast`、同期関数の合成には `pipe` と `flow`、非同期処理には `proc` を使います。いずれも `plgg` から直接インポートできます。

文字列を検証して中身を使う例は[値と変換](/packages/plgg/values-effects/)に、複数の項目を検証して理由を調べる方法は[構造とエラー](/packages/plgg/structures-errors/)にあります。

## どこまで本体で書けるか

題名の長さを返すだけなら、HTTP や SQL のパッケージは要りません。入口を unknown にしておくと、文字列以外の入力も型を偽らずにテストできます。次の関数では、最初の段階が成功した場合だけ `mapResult` の関数が呼ばれます。

| 必要な操作 | 関数と戻り値 |
| --- | --- |
| すでに `Str` か判定する | `isStr`(value) は型ガード |
| 生の値から `Str` を得る | `asStr`(value) は `Result`<`Str`, `InvalidError`> |
| 成功値を変換する | `mapResult`(f)(result) は新しい成功値か元の失敗 |
| 結果を一つの表示にまとめる | `matchResult`(onErr, onOk)(result) は各分岐に共通の戻り値 |

```ts
import { asStr, mapResult, type Str } from "plgg";

const measure = (v: unknown) =>
  mapResult((s: Str) => s.content.length)(
    asStr(v),
  );

console.log(measure("Atlas"), measure(5));
```
