# plgg-ir-manifest — ドメインの宣言を検証する

エンティティ、フィールド、ビュー、操作を宣言するには Domain Manifest を使います。`compileManifest` に `(plgg-ir 1 (module ...))` の形の原稿を渡します。成功時の `module` は検証済みのモデル、`canonical` は一定の書式にしたテキストです。参照や型に問題があれば診断の一覧が返ります。

```ts
import { compileManifest } from "plgg-ir-manifest";

const result = compileManifest(
  "(plgg-ir 1 (module library (entity book (field title (type string)))))",
);
console.log(result.__tag); // Ok
```
