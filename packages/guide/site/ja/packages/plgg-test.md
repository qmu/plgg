# plgg-test — テストを実行する

パッケージのディレクトリで `npx plgg-test src` を実行すると、`src` 以下の `*.spec.ts` が対象になります。一つの関数を直しながら繰り返し検証するには `--watch`、どの行を実行したか調べるには `--coverage` を追加します。

次のテストを `src/copies.spec.ts` に保存して実行します。期待値を変えると、どの比較が失敗したかを確認できます。

```ts
import { check, test, toBe } from "plgg-test";

test("counts the copies", () =>
  check(2 + 2, toBe(4)));
```

## 使い方と制約

`test(name, body) → void`

テストの関数から check の結果を返します。複数の条件は all にまとめます。戻り値を捨てると検証したつもりの条件が結果に反映されません。DOM を操作する spec は先頭の環境指定で専用の環境を選びます。

## 成功の中身まで検証する

タグだけを比べる試験では、入力と違う題名を保存しても見逃します。okThen に中身用の検査を渡すと、`Err` ならその時点で失敗し、`Ok` なら期待する文字列と比較できます。複数の同期的な検査には all、`Promise` で返る検査には allAsync を使います。

## キャスターの戻り値を検査する

```ts
import { asStr, type Str } from "plgg";
import {
  check,
  test,
  okThen,
  toBe,
} from "plgg-test";

test("preserves the spelling of a title", () =>
  check(
    asStr("Field Notes"),
    okThen((s: Str) =>
      check(s.content, toBe("Field Notes")),
    ),
  ));
```
