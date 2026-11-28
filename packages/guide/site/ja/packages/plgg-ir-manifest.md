# plgg-ir-manifest — ドメインの宣言を検証する

エンティティ、フィールド、ビュー、操作を宣言するには Domain Manifest を使います。`compileManifest` に `(plgg-ir 1 (module ...))` の形の原稿を渡します。成功時の `module` は検証済みのモデル、`canonical` は一定の書式にしたテキストです。参照や型に問題があれば診断の一覧が返ります。

```ts
import { compileManifest } from "plgg-ir-manifest";

const result = compileManifest(
  "(plgg-ir 1 (module library (entity book (field title (type string)))))",
);
console.log(result.__tag); // Ok
```

## 使い方と制約

`compileManifest(source) → Result<CompiledManifest, ReadonlyArray<SemDiagnostic>>`

表示側には検証済みの module、保存や差分確認には canonical を渡せます。フォームの名前を画面側でもう一度解釈すると二つの解釈がずれるので、後続処理は検証結果から始めます。診断が返った場合は入力の範囲を示して修正を促します。

## モデルから名前で探す

entityOf(module, name) や viewOf(module, name) は同じ名前の宣言を配列で返します。存在しないときは空の配列です。先頭を取り出せると決めつけると、設定で指定した画面名に誤りがあったときに困ります。配列の長さを調べるか、添字で読んだ値を `Option` にしてください。
