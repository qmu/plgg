# plgg-ir-syntax — S 式を読み書きする

`parseSexps` はテキストを位置情報付きの構文木に変えます。成功した木を `printSexps` に渡すと、同じ構造を一定の書式で出力できます。括弧が閉じていない場合は診断の位置を原文と照合してください。式の意味を定義する層は [plgg-ir-language](/packages/plgg-ir-language/) です。

```ts
import { isOk } from "plgg";
import {
  parseSexps,
  printSexps,
} from "plgg-ir-syntax";

const result = parseSexps("(book 42)");
if (isOk(result))
  console.log(printSexps(result.content));
```

## 使い方と制約

`parseSexps(source) → Result<ReadonlyArray<Sexp>, ReadonlyArray<SyntaxDiagnostic>>`

構文木ができても、その名前のフィールドや演算子があるとは限りません。まず括弧やトークンの誤りを位置付きで返し、名前の解決は言語層に渡します。正規形を保存する用途では印字した文字列の空白が元の入力と変わり得ます。

## 名前の誤りと括弧の誤りを分ける

たとえば (book 42) の末尾の括弧を落とした場合は `parseSexps` が診断を返します。book を別の名前に変えただけなら S 式としては読めます。その名前に意味があるかは次の言語層の判断です。元文書への下線表示は印字し直した文字列でなく、入力と診断の範囲から作ります。
