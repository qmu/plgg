# plgg-cli — コマンドの引数を検証する

コマンド名とオプションを `Program` として宣言し、コマンドごとのハンドラーと一緒に `runCli` に渡します。解析後の `Invocation` ではフラグ、値を取るオプション、位置引数を別々に読めます。未知のオプションや必須の値の欠落は `CliError` になります。

```ts
import { command, option, parseOptions } from "plgg-cli";

const list = command("list", "List books", [option("limit", "count")]);
console.log(parseOptions(list, ["--limit", "5"]));
```
