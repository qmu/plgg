# proc で非同期の処理をつなぐ

`proc` は各ステップの `Promise` を待ち、`Ok` なら中身を次に渡します。`Err` が返ると残りの処理を飛ばします。次の例では入力を空文字列に変えると、文字数を数える関数は呼ばれません。

```ts
import { asStr, proc } from "plgg";

const result = await proc(
  "Atlas",
  asStr,
  (title) =>
    Promise.resolve(title.content.length),
);
console.log(result); // Ok(5)
```

## どこで処理が止まるか

`proc` は通常の値、`Result`、それらを返す `Promise` を混ぜて扱えます。`Err` の後の関数は実行されません。たとえば入力に失敗した後で件数を増やしたり、保存を試みたりすることはありません。戻り値は `Promise` なので、結果のタグを読む前に await します。

拒否されるかもしれない `Promise` をそのまま先頭に置くのは避けます。実装は最初の値をステップ内の例外処理より前に await します。最後のステップが返す `Promise` の拒否にも注意してください。外部 API の失敗は、その API を呼ぶ箇所で `Result` に変換するのが確実です。

```ts
import { asStr, proc } from "plgg";

const size = (input: unknown) =>
  proc(input, asStr, (s) =>
    Promise.resolve(s.content.length),
  );

console.log(
  (await size("")).__tag,
  (await size("Map")).__tag,
);
```

## Promise の拒否を呼び出し箇所で受ける

`tryCatch` は同期関数と `Promise` を返す関数の両方を包めます。エラー変換関数を省くと、想定外の例外は `Defect` になります。次の例では URL の形式を間違えても `Promise` の拒否が画面まで漏れず、`Err` を処理できます。

```ts
import { tryCatch } from "plgg";

const hostname = tryCatch(
  async (raw: string) => new URL(raw).hostname,
);
console.log(
  await hostname("https://example.org"),
  await hostname("x"),
);
```
