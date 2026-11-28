# plgg-cli — Validate command-line arguments

Describe commands and their options in a `Program`, then pass it and the handlers to `runCli`. A parsed `Invocation` separates flags, value options, and positional arguments. An unknown option or a missing option value produces a `CliError`.

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

## Working with the API

`parseOptions(command, tokens) → Result<Invocation, CliError>`

Separate token parsing from command execution to try argument combinations without spawning processes. Test a value option at the end with its argument missing. Validate range separately before treating a parsed string as a count.

## Test the command boundary

The second argument of option is the argument name for a value option in a command specification. Naming it count does not convert it to an integer. `parseOptions` takes tokens already split into strings. A shell command line with quotes and spaces is a different representation.
