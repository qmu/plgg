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
