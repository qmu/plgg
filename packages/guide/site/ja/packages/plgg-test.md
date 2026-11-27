# plgg-test — テストを実行する

パッケージのディレクトリで `npx plgg-test src` を実行すると、`src` 以下の `*.spec.ts` が対象になります。一つの関数を直しながら繰り返し検証するには `--watch`、どの行を実行したか調べるには `--coverage` を追加します。

次のテストを `src/copies.spec.ts` に保存して実行します。期待値を変えると、どの比較が失敗したかを確認できます。

```ts
import { check, test, toBe } from "plgg-test";

test("counts the copies", () => check(2 + 2, toBe(4)));
```
