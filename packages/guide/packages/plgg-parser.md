# plgg-parser

A **generic parser combinator library with zero new
dependencies**, built from scratch on
[plgg](/packages/plgg/). A parser is plain data — a
data-last function, not a class or chaining builder:

```
Parser<A, S> =
  (state: ParseState<S>) =>
    Result<Parsed<A, S>, InvalidError>
```

Failure is a [`Result`](/concepts/result) carrying an
`InvalidError` with position context; optionality is
[`Option`](/concepts/option), never `null`; nothing
throws. Its only runtime dependency is `plgg`.

## Writing an app with it

Combinators are standalone data-last functions
composed like every other plgg pipeline. From the
package's own specs
(`src/Parse/usecase/repeat.spec.ts`):

```typescript
import {
  digit,
  char,
  many,
  between,
  sepBy1,
  run,
} from "plgg-parser";

// zero-or-more: Ok(["1","2","3"]) on "123x"
run(many(digit), "123x", 0);

// framed: Ok("7") on "(7)", Err on "(7]"
run(
  between(char("("), char(")"))(digit),
  "(7)",
  0,
);

// separated: Ok(["1","2","3"]) on "1,2,3"
run(sepBy1(char(","))(digit), "1,2,3", 0);
```

## Vocabulary

- **Model** — `ParseState<S>`, `Parsed<A, S>`, the
  `Parser<A, S>` function type, and the `parseError`
  helper on `InvalidError`.
- **Primitives** — `satisfy`, `literal`, `anyChar`,
  `eof`, and character classes (`digit`, `char`, …).
- **Combinators** — `map`, `andThen`, `seq`, `or`,
  `many` / `many1`, `optional`, `between`,
  `sepBy` / `sepBy1`, `lookahead`, `notFollowedBy`,
  `lazy`, and `run`.
- **User state** — `getUserState` / `setUserState`
  read and update the `S` slot threaded through the
  parse.

Alternative branches aggregate failures as `sibling`s
on the `InvalidError`, so an `or` reports every
branch's reason.

## The user-state slot

Lexing TypeScript-family code is context-sensitive: `/`
is a regex literal in operator position but division after
a value. `ParseState<S>` carries a user-state slot `S`
through the whole parse, so a grammar can remember the
last significant token and disambiguate. The production
grammar in [plgg-highlight](/packages/plgg-highlight)
uses that slot to classify tokens while preserving the
exact-source round-trip invariant.

## Why it exists

[plgg-highlight](/packages/plgg-highlight) now uses this
in-house parsing stack for its TypeScript-family grammar:
the combinator core lives here, and the production grammar
lives in plgg-highlight. The [frontmatter parser](/packages/plggpress)
plggpress reads site content with is built on the same
core.

Two deliberate design points: PEG-style **stateless
backtracking** makes an `attempt` combinator a no-op,
so it is omitted; and `many` / `seq` iterate
internally (a documented imperative seam) so a long
input never recurses per token.
