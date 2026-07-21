---
created_at: 2026-07-19T04:35:45+09:00
author: a-qmu-jp
type: enhancement
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on:
---

# plgg-cli: no default (subcommand-less) command; no typed option readers

Dogfooding feedback from putting ~14 CLI runners on `plgg-cli`. Two small
ergonomics gaps produced the same copy-pasted boilerplate in every runner.

## 6. No default (subcommand-less) command (low)

`runCli`/`runWith` dispatch only on a leading subcommand token; invoked with no
command (or an unknown one) they print the usage banner instead of running. A
single-purpose program invoked with bare flags (`my-tool --real`) therefore needs
an adapter that synthesizes a fixed command name and prepends it to `argv` before
dispatch.

**Request:** a first-class default-command concept, or a single-command `program`
variant, so a one-handler CLI does not need the argv-rewriting adapter.

## 7. No typed option readers (`optionList` / `optionInt`) (low)

`plgg-cli` provides `optionOf` (an `Option<string>`) but no typed readers for the
two commonest option shapes: a comma-separated id list (`Option → string[]`) and a
positive-integer-with-default. Every runner hand-writes the same
`pipe(optionOf(name), mapOption(...))` + `getOr(...)` with a verbatim
`.split(",").map(trim).filter` or `Number(...)` / `Number.isFinite` guard.

**Request:** small typed readers such as `optionList(name)` and `optionInt(name,
default)` to remove the copy-pasted boundary parsing.

## Policies

- **workaholic:implementation** (functional-programming, objective-documentation)
  — typed readers keep argv parsing at the boundary and out of every handler; the
  report cites the exact repeated call shapes.

## Quality Gate

- A one-handler CLI runs on bare flags (`my-tool --real`) with no argv-rewriting
  adapter.
- `optionList(name)` yields `string[]` and `optionInt(name, default)` yields a
  validated integer, replacing the hand-written split/Number guards — verified by
  tests over present/absent/malformed inputs.
