# plgg-parser

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

**A generic parser combinator library with zero new dependencies**,
built from scratch on [plgg](../plgg/). A parser is plain data — a
data-last function, not a class or chaining builder:

```
Parser<A, S> = (state: ParseState<S>) => Result<Parsed<A, S>, InvalidError>
```

Combinators (`map`, `andThen`, `seq`, `or`, `many`, `optional`,
`between`, `sepBy`, `lazy`, …) are standalone data-last functions
composed with `pipe`/`flow`, mirroring plgg's `cast`/`proc`
vocabulary. Failure is a `Result` carrying an `InvalidError` with
position context (alternative branches aggregate as `sibling`s);
optionality is `Option`, never `null`; nothing throws.

## Why this package exists

[`plgg-highlight`](../plgg-highlight/) highlights `<pre>`-wrapped
TypeScript by driving the TypeScript compiler's stateful
`ts.createScanner`, carrying `typescript` as a peer dependency.
plgg-parser is the in-house, dependency-free parsing stack that
replaces it: the combinator core here, the production TS grammar in
plgg-highlight.

```
plgg ── plgg-parser ── (demo) TS lexer
              └── plgg-highlight (production TS grammar, next ticket)
```

## The user-state slot

Lexing TypeScript is context-sensitive: `/` is a regex literal in
operator position but division after a value. `ParseState<S>` carries
a user-state slot `S` threaded through the whole parse, so a grammar
can remember the last significant token and disambiguate. Read it with
`getUserState`, update it with `setUserState`.

## How it's organized

- **Parse/model** — `ParseState<S>`, `Parsed<A, S>`, the `Parser<A, S>`
  function type, and the `parseError` helper on `InvalidError`.
- **Parse/usecase** — primitives (`satisfy`, `literal`, `anyChar`,
  `eof`, character classes) and combinators (`map`, `andThen`, `seq`,
  `or`, `many`/`many1`, `optional`, `between`, `sepBy`/`sepBy1`,
  `lookahead`, `notFollowedBy`, `lazy`, `run`).
- **Demo** — a TS-lexer grammar (spec/demo code) proving the core can
  lex TypeScript into classified tokens, with the exact-source
  round-trip invariant and the three hard edge cases (nested template
  interpolation, regex-vs-division, unterminated-at-EOF degrading to
  plain).

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root `CLAUDE.md`).
- The only runtime dependency is `plgg`; `typescript` is a
  dev-dependency for type-checking only — no peer dependency, so the
  library adds nothing to a consumer's install.
- `many`/`seq` iterate internally (a documented imperative seam) so a
  long `<pre>` block never recurses per token.
- After editing a `file:`-linked dependency's source, rebuild its
  `dist` or this package won't see new exports.
