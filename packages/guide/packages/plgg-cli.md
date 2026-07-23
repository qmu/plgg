# plgg-cli

A **toolkit for building command-line program
wrappers**, built from scratch on
[plgg](/packages/plgg/). Declare a program's commands and
options as typed data, parse `process.argv` into a
validated `Invocation`, dispatch to a handler, and fold
the handler's [`Result`](/concepts/result) into a shell
outcome — stdout on `Ok`, stderr + a non-zero exit code
on `Err` — with an auto-generated usage banner. Its only
runtime dependency is `plgg`.

## Writing an app with it

Declare the command tree as typed data, then write a
handler that reads its `Invocation` and returns a shell
outcome **as a value**. Lookups are
[`Option`](/concepts/option), so a handler composes as one
[`pipe`](/concepts/composition):

```typescript
import {
  pipe,
  matchOption,
  ok,
  type PromisedResult,
  type SoftStr,
} from "plgg";
import {
  type Invocation,
  type Handler,
  program,
  command,
  option,
  flag,
  optionOf,
  hasFlag,
  runCli,
} from "plgg-cli";

const app = program("greet", "say hi", [
  command("hello", "greet someone", [
    option("name", "n"),
    flag("loud"),
  ]),
]);

const hello: Handler = (
  inv: Invocation,
): PromisedResult<SoftStr, SoftStr> =>
  pipe(
    inv,
    optionOf("name"), // Option<SoftStr>
    matchOption(
      () => "hello, world",
      (name) =>
        hasFlag("loud")(inv)
          ? `HELLO, ${name}!`
          : `hello, ${name}`,
    ),
    (line) => Promise.resolve(ok(line)),
  );

runCli(app, { hello });
```

`runCli` reads real argv and folds the outcome at one
seam — the `Ok` message goes to stdout, an `Err` to stderr
with a non-zero exit — so the handler stays pure data.

## Vocabulary

The toolkit covers the whole command surface as pure plgg
data, grouped by concern:

- **program shape** — `program`/`command`/`option`/`flag`
  build the command tree as typed data, where `option`
  declares a value-option (`--name <arg>`) and `flag` a
  boolean presence signal (`--watch`).
- **invocation** — `Invocation` is the parsed command
  line; `optionOf` reads a value-option as
  [`Option`](/concepts/option) and `hasFlag` reports a
  boolean flag's presence — both data-last.
- **run** — `Handler`/`Handlers` map a subcommand to work
  that returns a [`Result`](/concepts/result); `runCli`
  wires the real `process`, while `runWith` takes explicit
  argv and an injected `CliConsole` for testing.
- **failure** — `CliError` (a [`Box`](/concepts/tagged-data)
  union of `missingOptionValue`/`unknownOption`) with its
  `$`-matchers (`missingOptionValue$()`) and
  `formatCliError`.

Everything is pure plgg data: lookups are
[`Option`](/concepts/option), validation is
[`Result`](/concepts/result), failures are values matched
**by name**, and `process` is touched at exactly one seam.
The exact constructor and combinator list lives in the
`plgg-cli` source.

## Why it exists

Everywhere else in this monorepo "CLI" means *a package's
own `argv` → exit-code entrypoint*. plgg-cli is the
toolkit those entrypoints are **built on** — it wraps
*your* program as a command-line program:

```
plgg ── plgg-cli ── your program's bin
```

It does **not** spawn *external* programs — a
`spawn`/`exec` library is a separate concern. `process`
is touched at exactly one seam, so the command model
itself stays pure plgg data.

## How it's organized

- **model** — `program`/`command`/`option`/`flag`
  constructors build the command tree as typed data, and
  argv parses into an `Invocation`.
- **usecase** — `optionOf`/`hasFlag` read an invocation's
  values as [`Option`](/concepts/option), and `runCli`
  runs the matched handler and folds its
  [`Result`](/concepts/result) to a shell outcome.

A handler returns its outcome as a *value* rather than
writing to the console itself, so the effectful edge
(stdout / stderr / exit code) lives in one place. The
exact constructor and combinator list lives in the
`plgg-cli` source.
