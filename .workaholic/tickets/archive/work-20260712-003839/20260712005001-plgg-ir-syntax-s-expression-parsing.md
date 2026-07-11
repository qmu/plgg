---
created_at: 2026-07-12T00:50:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash: 9c704ea4
category: Added
depends_on:
mission: build-the-plgg-ir-package-family
---

# plgg-ir-syntax — S-expression parsing/printing with source positions (Phase 1)

## Overview

First package of the `plgg-ir` family (mission
`build-the-plgg-ir-package-family`, design.md §18–21, §38 Phase 1). A minimal
S-expression syntax library: it parses source text into **position-aware
syntax trees** and prints syntax trees back into a **canonical textual
representation**, assigning no domain meaning whatsoever (it does not know
what `entity` or `policy` mean — that is `plgg-ir-language` /
`plgg-ir-manifest` territory, later tickets).

Scope (design §19):

- Atoms: symbols, strings, numbers, booleans (comments if needed — decide at
  drive; if supported they are skipped trivia, never tree nodes).
- Lists (nested), the uniform expression tree.
- Source positions and ranges on every node (offset + line/column), for the
  LLM-correction error model (§35).
- Syntax diagnostics for malformed input: unclosed lists, invalid literals,
  incomplete expressions, invalid tokens (§16.1) — ranged, structured
  (code / severity / message / range), accumulated not thrown.
- Printer: canonical, deterministic serialization; the property
  `parse(print(parse(x))) = parse(x)` must hold under property-style tests.

## Key decisions

1. **Build the tokenizer/parser on `plgg-parser`** (the in-house zero-dep
   combinator lib, `Parser<A,S>` over `ParseState` which already threads a
   character `position`). plgg-highlight already tokenizes with it — same
   pattern. Line/column derive from offsets (precompute a line-start table
   over the source). Dependencies stay one-directional:
   `plgg → plgg-parser → plgg-ir-syntax`. Zero NEW deps (vendor-neutrality
   policy).
2. **Syntax tree is plain plgg-style data**: a tagged-union `Sexp` (Symbol /
   Str / Num / Bool / List) each carrying a `SourceRange`; branded types +
   exhaustive `match`, Option/Result, no classes.
3. **Diagnostic model starts here** (code, severity, message, range) and is
   the shape the whole family reuses — design §35. Keep it in this package
   only if it stays purely syntactic; if it is family-generic, still define
   it here (lowest layer) so upper layers can reuse without a cycle.

## Key Files

- `packages/plgg-parser/src/Parse/` — combinator core to build on:
  `model/ParseState.ts` (position cursor), `model/ParseError.ts`,
  `usecase/{primitive,sequence,choice,repeat,lookahead,run}.ts`.
- `packages/plgg-parser/src/Demo/usecase/tsLexer.ts` — the reference for a
  real grammar built on the combinators.
- `packages/plgg-highlight/` — second consumer example (grammar over
  plgg-parser).
- `scripts/build.sh` — insert `plgg-ir-syntax` build after `plgg-parser`
  (dependency order is hand-maintained there, commented).
- `scripts/npm-install.sh`, `scripts/check-all.sh`, new
  `scripts/test-plgg-ir-syntax.sh` — wire the package in (the CI-fix lesson).
- `README.md` — package index entry.
- `.workaholic/missions/build-the-plgg-ir-package-family/design.md` §4, §16.1,
  §18–21, §33, §35, §40 — the binding design.

## Policies

- `workaholic:implementation` / type-driven design — branded types,
  Option/Result, exhaustive match, **no `as`/`any`/`ts-ignore`**; expression
  style, pipe/proc; Prettier printWidth 50 (`.prettierrc.json` at scaffold).
- Scaffold gotchas (memory): omit `type: module`, tsconfig `rootDir: src`,
  package.json modeled on `plgg-parser`'s (plgg-bundle build, plgg-test
  test), rebuild dist before any consumer reads the barrel.
- Coverage: >90% statements/branches/functions/lines via
  `plgg-test src --coverage`; prefer `proc` over isErr-guard chains so
  defensive branches stay coverable.

## Implementation Steps

1. Scaffold `packages/plgg-ir-syntax/` (package.json from plgg-parser
   template, tsconfig rootDir src, `.prettierrc.json` printWidth 50, README).
2. Model layer: `SourcePos`/`SourceRange`, `Sexp` tagged union (atoms +
   list) with ranges, `SyntaxDiagnostic` (code/severity/message/range).
3. Tokenizer/reader on plgg-parser combinators: symbols, strings (with
   escapes), numbers, booleans, list open/close, whitespace(/comment) trivia;
   line-start table for offset→line/column.
4. Parser: source → `Result<ReadonlyArray<Sexp>, ReadonlyArray<SyntaxDiagnostic>>`
   (top level is a sequence of expressions); malformed input yields ranged
   diagnostics, accumulated where recovery is cheap.
5. Printer: canonical deterministic text from a `Sexp` (stable spacing/
   indentation rules — the canonical formatting §34 relies on).
6. Tests: parsing, ranges, malformed input, canonical printing, and the
   round-trip property `parse(print(parse(x))) = parse(x)` over a generated
   corpus (hand-rolled generator; no new dev-dep).
7. Wire monorepo: build.sh (after plgg-parser), npm-install.sh, check-all.sh,
   test-plgg-ir-syntax.sh, README index. Run fresh `check-all` (stale-dist
   lesson).

## Quality Gate

**Acceptance criteria (mission acceptance item 1):**
- Parses S-expression source into position-aware trees; prints canonically.
- Malformed input yields ranged, coded diagnostics (never throws).
- Round-trip property holds under property-style tests.
- >90% coverage; house style; zero `as`/`any`/`ts-ignore`.
- Package wired into build.sh/npm-install.sh/check-all.sh/test script/README.

**Verification:** `./scripts/test-plgg-ir-syntax.sh` green (tsc --noEmit +
plgg-test with coverage); `./scripts/check-all.sh` green from fresh dists.

## Considerations

- Number model: decide integer-vs-decimal representation carefully (Domain
  Manifest later needs money/percentage literals); do NOT use JS float
  formatting tricks in the printer — canonical text must be stable.
- Symbol charset: kebab-case symbols (`length-between`, `>=`, `=`) must
  tokenize; define the accepted symbol alphabet explicitly and reject the
  rest (closed, regular grammar — LLM-oriented design §34).
- Keep the package free of any manifest vocabulary — the boundary test is
  "could a JSON-config dialect reuse this unchanged?".
- Docs: this ticket covers the syntax-layer README (lexical structure,
  literals, symbols, lists); the three-layer guide docs are finalized in the
  Phase 5 ticket.
