# plgg-ir-syntax

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

**A minimal S-expression syntax library for the `plgg-ir` family**,
built on [plgg](../plgg/) and [plgg-parser](../plgg-parser/). It
parses source text into **position-aware syntax trees** and prints
trees back into a **canonical textual representation** — and it
assigns no domain meaning: this layer does not know what `entity`
or `policy` mean.

```
source text ──parseSexps──▶ ReadonlyArray<Sexp>  (every node carries a SourceRange)
Sexp tree   ──printSexp───▶ canonical text       (deterministic layout)
```

## Why this package exists

The `plgg-ir` family gives LLM agents a restricted, statically
verifiable intermediate representation: an agent generates a
Lisp-style **Domain Manifest**, the toolchain verifies and
normalizes it, and consumers such as `plggmatic` interpret the
canonical result deterministically. This package is the family's
lowest layer — the source structure:

```
plgg ── plgg-parser ── plgg-ir-syntax ── plgg-ir-language (next) ── plgg-ir-manifest
```

## What it provides

- **`Sexp`** — a `Box`-union syntax tree: symbols, strings,
  numbers, booleans, lists; every node carries a half-open
  `SourceRange` (`offset` + 1-based `line`/`column`).
- **`parseSexps(source)`** —
  `Result<ReadonlyArray<Sexp>, ReadonlyArray<SyntaxDiagnostic>>`.
  Diagnostics are structured values (stable `code`, severity,
  message, range) and **accumulate over the whole source** with
  recovery — an unexpected character, malformed number, invalid
  escape, unterminated string/list, or stray `)` each produce
  their own coded diagnostic; nothing throws.
- **`printSexp` / `printSexps`** — the canonical printer. A list
  of only atoms prints inline (`(length-between 1 200)`);
  otherwise the leading atoms stay on the head line and every
  remaining element gets its own indented line — the layout the
  design document writes manifests in. Printing is deterministic
  and `parse(print(parse(x))) = parse(x)` holds (property-tested);
  compare trees with `sexpEquals`, which ignores ranges.
- **`tokenize(source)`** — the underlying lexer (tokens + lexical
  diagnostics), exposed for the language layer.

## The grammar (closed, LLM-oriented)

- Symbols: ASCII letters, digits, and `-+*/<>=!?._`
  (`length-between`, `>=`, `task.project.client`).
- Numbers: `-?digits(.digits)?([eE][+-]?digits)?`, must be finite;
  a digit-leading lexeme that fails this is
  `syntax.invalid-number`.
- Booleans: `true` / `false`.
- Strings: double-quoted with the closed escape set `\"` `\\`
  `\n` `\t` `\r`.
- `;` starts a line comment; comments and whitespace are trivia.
- Anything else is `syntax.unexpected-character` — the vocabulary
  is closed by design so LLM drift is a compile error, not a
  silent pass-through.

## How it's organized

- **domain/model** — `SourcePos`, `SourceRange`, `LineIndex`
  (offset→line/column), `SyntaxDiagnostic` (+ the stable
  `syntax.*` codes), `Token`, `Sexp` (+ `sexpEquals`,
  `sexpRange`).
- **domain/usecase** — `tokenize` (plgg-parser combinators with
  the user-state slot accumulating diagnostics), `parseSexps`
  (token reader with recovery), `printSexp`/`printSexps` (the
  canonical printer).

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root `CLAUDE.md`).
- Runtime dependencies are `plgg` and `plgg-parser` only — zero
  third-party dependencies.
- After editing a `file:`-linked dependency's source, rebuild its
  `dist` or this package won't see new exports.
