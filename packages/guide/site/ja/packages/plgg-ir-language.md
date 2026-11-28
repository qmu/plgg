# plgg-ir-language — 言語の構文に意味を与える

フォームや演算子、名前のスコープを定義し、`compileSource(language)(source)` に入力を渡します。処理は構文解析、展開、意味解析、正規化の順です。成功時には解析済みノードと正規化したテキストが得られます。実際の定義例には[ドメインモデル](/packages/plgg-ir-manifest/)と[論証](/packages/plgg-ir-thesis/)があります。

## 使い方と制約

`compileSource(language)(source) → Result<Compiled<N>, ReadonlyArray<SemDiagnostic>>`

同じ S 式でも、方言が違えば使えるフォームや名前の範囲が変わります。language を先に固定すると、各ファイルに同じ規則を適用できます。既存のマニフェストを読むだけなら専用の `compileManifest` が入力の外枠まで扱います。

```ts
import { compileSource } from "plgg-ir-language";
import { manifestLanguage } from "plgg-ir-manifest";

const compile = compileSource(manifestLanguage);
console.log(compile("(unknown-form)").__tag);
```

## コンパイル結果を使い分ける

Compiled の nodes は方言が意味を与えた値です。normalized は正規化後の S 式の列で、canonical は印字した文字列です。たとえば構造の検査に使うなら nodes を参照します。失敗時に次の段階へ進むことはなく、構文の診断も共通の SemDiagnostic として返ります。
