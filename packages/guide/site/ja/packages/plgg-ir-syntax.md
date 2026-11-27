# plgg-ir-syntax — S 式を読み書きする

`parseSexps` はテキストを位置情報付きの構文木に変えます。成功した木を `printSexps` に渡すと、同じ構造を一定の書式で出力できます。括弧が閉じていない場合は診断の位置を原文と照合してください。式の意味を定義する層は [plgg-ir-language](/packages/plgg-ir-language/) です。

```ts
import { isOk } from "plgg";
import { parseSexps, printSexps } from "plgg-ir-syntax";

const result = parseSexps("(book 42)");
if (isOk(result)) console.log(printSexps(result.content));
```
