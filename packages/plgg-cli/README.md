# plgg-cli

A plgg-style toolkit for **building command-line program wrappers** — the
`commander.js` idea done in [plgg](../plgg/): declare a program's commands and
options as typed data, parse `process.argv` into a validated
[`Invocation`](src/Cli/model/Invocation.ts), dispatch to a handler, and fold the
handler's `Result` into a shell outcome (stdout / stderr / exit code) — with an
auto-generated usage banner.

> **Naming, on purpose.** Everywhere else in this monorepo "CLI" means *a
> package's own argv→exit-code entrypoint*. `plgg-cli` is the toolkit those
> entrypoints are **built on** — it wraps *your* program as a command-line
> program. It does **not** spawn *external* programs (a `spawn/exec` library is a
> separate, future concern).

> **UNSTABLE / EXPERIMENTAL POC.** plgg discipline is non-negotiable: errors as
> values, expression-only bodies, `process` touched at exactly one seam, no
> `as`/`any`/`@ts-ignore`. plgg-cli's only runtime dependency is `plgg`.

## Usage

```ts
import { ok, err, getOr, pipe } from "plgg";
import {
  program, command, option, flag,
  optionOf, hasFlag, runCli,
} from "plgg-cli";

const app = program("greet", "a tiny demo CLI", [
  command("hello", "print a greeting", [
    option("name", "who", "who to greet"),
    flag("shout", "upper-case the greeting"),
  ]),
]);

// A handler returns its shell outcome as a value: Ok -> stdout, Err -> stderr + exit 1.
const hello = (inv) =>
  pipe(
    getOr("world")(optionOf("name")(inv)),
    (who) =>
      hasFlag("shout")(inv)
        ? `HELLO, ${who.toUpperCase()}!`
        : `Hello, ${who}.`,
    (line) => Promise.resolve(ok(line)),
  );

// Reads process.argv, dispatches, and folds the Result to the shell.
await runCli(app, { hello });
```

## Design

- **Typed spec, in data.** `program` / `command` / `option` / `flag` build a
  plain `Readonly` description; a value-option (`option("config", "path")`) takes
  the following token, a boolean flag (`flag("watch")`) is presence-only.
- **Strict parsing.** A value-option with no following token is a
  `MissingOptionValue`; an undeclared `--flag` is an `UnknownOption`. Both are
  `Box`-tagged `CliError`s that `runCli` renders to stderr with a non-zero exit —
  no silent leniency.
- **One seam.** `process.argv` / stdout / stderr / `exitCode` live only in
  [`seam.ts`](src/Cli/usecase/seam.ts) behind an injectable `CliConsole`, so the
  whole run fold is testable with a fake and zero global mutation (`runWith`).
- **`SoftStr`, honestly.** argv values (and authored spec labels) are the bare
  `SoftStr` primitive — argv tokens are genuinely possibly-empty, so branding
  them `Str` would be dishonest. Lift to `Str` with `asStr` at a call site that
  actually needs a non-empty guarantee.

## License

MIT
