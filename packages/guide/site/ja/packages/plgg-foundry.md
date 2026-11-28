# plgg-foundry — 依頼から操作の順序を決める

アプリで実行できる操作を `makeFoundry` で登録して、`runFoundry(foundry)` に依頼文を渡します。`blueprint` が依頼から計画（`Alignment`）を作り、`operate` が計画に沿って操作を実行します。実行前の計画を見るには `beforeOperations`、実行後の結果を見るには `afterOperations` を指定します。

## 使い方と制約

`runFoundry(foundry)(input: string or OrderSpec)`

装置の一覧を `makeFoundry` に渡して、実行できる操作を先に定めます。実行時には依頼を Order に検証し、計画を作ってから操作を適用します。`maxOperationLimit` の既定値は 10 です。計画だけを調べたいときは `blueprint` の段階で止めます。

```ts
import { makeFoundry } from "plgg-foundry";

const plan = makeFoundry({
  description: "Catalog books",
  apparatuses: [],
});
console.log(plan.maxOperationLimit); // 10
```

## 実行計画と出力を調べる

`blueprint`(foundry)(order) が返す成功値は `Alignment` です。これを `operate`(foundry)(order) に渡すと、操作を順番に実行し、最後の出力を名前で引ける params と計画を持つ `Medium` を返します。途中で失敗した場合は完了後のフックまで進みません。決まった一回のモデル呼び出しで十分なら plgg-kit の方が直接書けます。
