# plgg-cli — Validate command-line arguments

Describe commands and their options in a `Program`, then pass it and the handlers to `runCli`. A parsed `Invocation` separates flags, value options, and positional arguments. An unknown option or a missing option value produces a `CliError`.

```ts
import { command, option, parseOptions } from "plgg-cli";

const list = command("list", "List books", [option("limit", "count")]);
console.log(parseOptions(list, ["--limit", "5"]));
```
