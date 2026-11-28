# plgg-cli — コマンドの引数を検証する

コマンド名とオプションを `Program` として宣言し、コマンドごとのハンドラーと一緒に `runCli` に渡します。解析後の `Invocation` ではフラグ、値を取るオプション、位置引数を別々に読めます。未知のオプションや必須の値の欠落は `CliError` になります。

```ts
import {
  command,
  option,
  parseOptions,
} from "plgg-cli";

const list = command("list", "List books", [
  option("limit", "count"),
]);
console.log(parseOptions(list, ["--limit", "5"]));
```

## 使い方と制約

`parseOptions(command, tokens) → Result<Invocation, CliError>`

引数の字句解析と処理本体を分けると、プロセスを起動せずに入力の組み合わせを試せます。値を取るオプションを最後に単独で置いた場合もテストします。文字列を件数に使うなら、解析に成功してから範囲を確かめます。

## コマンドの境界を試す

command(name, summary, options) に渡す option の第2引数は、値の説明に使う名前です。件数という名前を付けても整数には変換されません。`parseOptions` は既に分割された文字列の配列を受けるため、引用符や空白を含むシェルの一行をそのまま渡さないようにします。
