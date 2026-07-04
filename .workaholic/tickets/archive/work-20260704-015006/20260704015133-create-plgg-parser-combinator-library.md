---
created_at: 2026-07-04T01:51:33+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Config]
effort: 4h
commit_hash:
category: Added
depends_on:
---

# Create plgg-parser: generic parser combinator library

## Overview

Create `packages/plgg-parser`, a generic-purpose parser combinator library built purely on `plgg` primitives (Result/Option/Box/pipe/InvalidError), with zero new external dependencies. Its motivating use case is parsing TypeScript source wrapped in `<pre></pre>` for syntax highlighting by `plgg-highlight` — which today drives the TypeScript compiler's stateful `ts.createScanner` and carries `typescript` as a peerDependency. This ticket delivers the combinator core plus a runnable proof-of-value demo (a TS-lexer grammar exercised in a spec); the actual `plgg-highlight` migration is the dependent follow-up ticket `20260704015134-migrate-plgg-highlight-to-plgg-parser.md`.

A parser is a plain data-last function, not a class or chaining builder:

```
Parser<A> = (state: ParseState) => Result<Parsed<A>, InvalidError>
```

where `ParseState` is `Readonly<{ source; position }>` (or equivalent) and `Parsed<A>` carries the value plus the advanced state. Combinators (`map`, `andThen`/`seq`, `or`/`alt`, `many`, `optional`, `between`, `sepBy`, `lazy`, …) are standalone data-last functions composed with `pipe`/`flow`, mirroring the `cast`/`proc` vocabulary. Sum types (parse errors, demo token kinds) are `Box<TAG, CONTENT>` unions with one constructor per variant and `$`-suffixed pattern helpers.

**Note on Quality Gate provenance**: the developer was away during the ticket-time interrogation; the Quality Gate below records the interrogation's recommended defaults (split scope, house gate + round-trip invariant, tokenize→spans demo, three hard lexing edge cases). Adjust before `/drive` approval if these defaults are wrong.

## Policies

The standard engineering policies that govern this ticket. The implementing session MUST read each linked policy hard copy before writing code and keep every change defensible against that policy's Goal (目標), Responsibility (責務), and Practices (実践).

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout (applies to all code work; this ticket scaffolds a new package)
- `workaholic:implementation` / `policies/coding-standards.md` — TypeScript/style conventions; the no-`as`/`any`/`ts-ignore` rule bites hardest in generic combinator type-level code
- `workaholic:implementation` / `policies/type-driven-design.md` — model `Parser<A>`, parse state, and errors so invalid compositions fail to type-check
- `workaholic:implementation` / `policies/functional-programming.md` — combinators as pure data-last functions composed via pipe/flow; no classes, no method chaining; imperative cursor loops only at documented seams
- `workaholic:implementation` / `policies/test.md` — colocated `*.spec.ts` per public function; >90% coverage is the hard gate
- `workaholic:design` / `policies/vendor-neutrality.md` — zero new external dependencies; a parser combinator lib is precisely the thing people npm-install, and this one is built in-house on `plgg` only
- `workaholic:design` / `policies/sacrificial-architecture.md` — keep the combinator core a small, well-bounded, replaceable module so `plgg-highlight` can adopt it (or fall back) without lock-in
- `workaholic:planning` / `policies/proactive-poc.md` — prove value with a runnable demo (TS snippet → classified tokens) before the consumer migrates

## Key Files

- `packages/plgg/src/Disjunctives/Result.ts` - the success/failure channel the parser return type builds on (map/chain/mapErr/matchResult)
- `packages/plgg/src/Disjunctives/Option.ts` - optionality/backtracking outcomes are `Option<A>`, never null
- `packages/plgg/src/Contextuals/Box.ts` - tagged-variant foundation for parse errors and demo token kinds (plus `Contextuals/Pattern.ts` for `$` helpers)
- `packages/plgg/src/Exceptionals/InvalidError.ts` - the standard failure value; `sibling` aggregation models alternative-branch parse failures
- `packages/plgg/src/Flowables/cast.ts` - canonical synchronous Result-composition; the model for how sequence combinators thread state and aggregate errors
- `packages/plgg/src/Flowables/proc.ts` - async seam counterpart; combinator naming should mirror pipe/flow/match data-last shape
- `packages/plgg-highlight/src/Token/model/Token.ts` - `TokenKind` 9-variant Box union (Keyword/String/Number/Comment/Identifier/Punctuation/Regex/Template/Plain) the demo grammar's output must be compatible with
- `packages/plgg-highlight/src/Token/usecase/tokenize.ts` - the `ts.createScanner` loop the library will eventually replace; documents the exact round-trip invariant (skipTrivia=false, token texts concatenate back to exact input, never throws)
- `packages/plgg-md/src/Render/model/seam.ts` - the `Highlighter = (lang: Option<SoftStr>, code: SoftStr) => Html<never>` seam the demo pipeline feeds
- `packages/plgg-md/src/Block/usecase/parseBlocks.ts` - hand-rolled cursor/regex block parser; primary evidence of shared combinator needs and a candidate second consumer
- `packages/plgg-md/src/Inline/usecase/renderInline.ts` - hand-rolled inline scanner (alternation, longest-match, recursion) the combinators should be able to express declaratively
- `packages/plgg-highlight/package.json` - scaffold template (build=plgg-bundle, test=`tsc --noEmit && plgg-test src`, `file:../plgg` dep); plgg-parser has NO typescript peer/runtime dep
- `packages/plgg-highlight/tsconfig.json` - strict tsconfig to copy verbatim with alias `plgg-parser*` → `./src/*`
- `packages/plgg-highlight/plgg-test.config.json` - coverage threshold 90, exclude `/index.ts` — copy as-is
- `packages/plgg-highlight/bundle.config.ts` - bundle config template (alias prefix `plgg-parser`, externals from package.json = just plgg)
- `scripts/test-plgg-highlight.sh` - per-package runner pattern; plgg-parser needs matching `test/tsc/coverage/test-watch/tsc-watch-plgg-parser.sh` plus registration in `check-all.sh`/`menu.sh`

## Related History

The monorepo has shipped one scanner-based highlighter and two hand-rolled pure parsers; all three establish the conventions (Result not throw, imperative seams only documented, >90% coverage) this library generalizes, and the scaffolding pattern is well-worn.

Past tickets that touched similar areas:

- [20260630013503-plgg-highlight-ts-scanner.md](.workaholic/tickets/archive/work-20260630-013457/20260630013503-plgg-highlight-ts-scanner.md) - Created plgg-highlight via ts.createScanner (the named consumer; documents the token taxonomy, the pre>code render seam, and the round-trip invariant this library must preserve)
- [20260627210148-parser-fs-and-plan.md](.workaholic/tickets/archive/work-20260627-205005/20260627210148-parser-fs-and-plan.md) - plgg-db-migration's parseMigration (closest precedent for a pure Result-returning, table-tested parser)
- [20260630013501-plgg-md-scaffold-frontmatter-block-ast.md](.workaholic/tickets/archive/work-20260630-013457/20260630013501-plgg-md-scaffold-frontmatter-block-ast.md) - plgg-md's block tokenizer + frontmatter splitter (hand-rolled parsing hinting at shared combinator needs)
- [20260630013502-plgg-md-inline-fold-to-html.md](.workaholic/tickets/archive/work-20260630-013457/20260630013502-plgg-md-inline-fold-to-html.md) - plgg-md inline parser and the injected Highlighter seam (the pipeline `<pre>` highlighting plugs into)
- [20260527142355-create-plgg-sql-builder.md](.workaholic/tickets/archive/plgg-sql/20260527142355-create-plgg-sql-builder.md) - representative new-workspace-package scaffold (package.json + bundle.config.ts + plgg-test.config.json with >90% thresholds)

## Implementation Steps

1. Scaffold `packages/plgg-parser` mirroring `plgg-highlight` minus the typescript dep: `package.json` (dependency `plgg` via `file:../plgg` only; devDeps `plgg-bundle`, `plgg-test`, `typescript`, `@types/node`; scripts build/test/coverage matching siblings; dual ES+CJS exports with `dist/index.d.ts`), `.prettierrc.json` (printWidth 50, copied verbatim), `tsconfig.json` (strict superset with `plgg-parser*` → `./src/*` alias), `plgg-test.config.json` (`{"coverage":{"threshold":90,"exclude":["/index.ts"]}}`), `bundle.config.ts` (alias prefix `plgg-parser`).
2. Core model (`src/Parse/model/` or similar domain folders — plgg-parser defines its own; it does not extend plgg's eleven-category taxonomy): `ParseState` as Readonly plain data (source + position, optionally line/column for error reporting), `Parsed<A>` (value + next state), `Parser<A>` as the function type, `ParseError` built on `InvalidError` carrying position context.
3. Primitive parsers (`src/Parse/usecase/`): `satisfy` (char predicate), `literal` (exact string), `anyChar`, `eof`, character-class helpers. Each is one returned expression where possible; a cursor-advance seam, if irreducible, gets the documented-exception comment.
4. Combinators: `map`, `andThen`/`seq` (threading state, short-circuiting on first Err like `cast`), `or`/`alt` (aggregating branch failures as `InvalidError` siblings), `many`/`many1` (iterative internally — a documented imperative seam — to avoid stack overflow on long inputs), `optional` (returns `Option<A>`), `between`, `sepBy`, `lookahead`, `attempt` (backtracking), `lazy` (recursive grammars). All data-last, composed with `pipe`/`flow`.
5. Stateful-lexing seam: design the state threading so a grammar can carry user context (e.g. "last significant token") through the parse — required later for TS's regex-vs-division disambiguation. Either parameterize `ParseState` with a user-state slot or provide a documented pattern; decide during implementation and record the choice.
6. Proof-of-value demo (colocated spec, e.g. `src/Demo/usecase/tsLexer.spec.ts` or equivalent): a TS-lexer grammar built from the combinators that lexes a representative TypeScript snippet (as it would appear inside `<pre></pre>`) into classified tokens compatible with plgg-highlight's `TokenKind` taxonomy, covering the three hard edge cases (nested template interpolation, regex-vs-division, comments/strings incl. unterminated-at-EOF degrading to plain without throwing), and asserting the round-trip invariant (token texts concatenate back to the exact source).
7. Root `src/index.ts` re-exporting domain barrels (public API exclusively through the root; consumers import `plgg-parser`, never cross-package relative paths).
8. Repo wiring: `scripts/{test,tsc,coverage,test-watch,tsc-watch}-plgg-parser.sh` matching sibling runners; register in `scripts/check-all.sh` and `scripts/menu.sh`; run `scripts/npm-install.sh` (or the sibling-established install path) so the workspace links.
9. Colocated `*.spec.ts` per public combinator (success, failure, short-circuit, sibling aggregation, backtracking) until coverage exceeds 90% on all four metrics.

## Quality Gate

How the outcome's quality is assured. `/drive` surfaces this in its approval prompt; approval is against this pre-agreed gate. (Recorded from the interrogation's recommended defaults — developer was AFK; adjust before approval if wrong.)

**Acceptance criteria** — the checkable conditions that must hold:

- `packages/plgg-parser` exists with the full sibling scaffold (package.json, .prettierrc.json printWidth 50, strict tsconfig with self-alias, plgg-test.config.json threshold 90, bundle.config.ts) and depends only on `plgg` (`file:../plgg`); `grep -E '"(dependencies|peerDependencies)"' -A5 packages/plgg-parser/package.json` shows no other runtime/peer dep.
- Zero type escapes: `grep -rnE '\bas\s+[A-Z]| any\b|ts-ignore|ts-expect-error' packages/plgg-parser/src` (excluding `.spec.ts` string literals) finds nothing.
- No throw in domain code: parse failure is always `Err(InvalidError)` with position info; alternation failures carry branch errors as siblings. `grep -rn 'throw ' packages/plgg-parser/src` hits only lifted/documented seams (ideally zero).
- The demo spec lexes a representative TS snippet into TokenKind-taxonomy-compatible classified tokens and asserts: (a) exact-source round-trip (concatenated token texts === input), (b) nested template interpolation tokenized with balanced `${}`, (c) `/pattern/g` vs `a / b` classified correctly by context, (d) unterminated comment/string at EOF yields tokens (degraded to plain), not a throw or Err from the lexer entry point.
- Coverage >90% on statements, branches, functions, and lines (plgg-test threshold 90; index.ts barrels excluded).

**Verification method** — the commands/tests/probes that prove them:

- `scripts/tsc-plgg-parser.sh` — clean compile (`tsc --noEmit`).
- `scripts/test-plgg-parser.sh` — suite green including the demo spec.
- `scripts/coverage-plgg-parser.sh` — all four metrics >90%.
- `scripts/check-all.sh` — fresh rebuild green across the workspace (catches wiring/consumer drift).
- The two greps above for type escapes and throws.

**Gate** — what must pass before approval:

- All five commands above green, Prettier printWidth-50 conformant (no hand-packed lines), and the demo spec present and passing with the round-trip + three-edge-case assertions.

## Considerations

- Regex-vs-division disambiguation makes TS lexing context-sensitive; the combinator core must support user-state threading (step 5) or the demo grammar cannot classify `Regex` correctly — this is a design decision to settle before writing combinators, not after (`packages/plgg-highlight/src/Token/usecase/tokenize.ts`)
- `many`/`seq` over long `<pre>` blocks must not recurse per-token: implement iteratively as a documented imperative seam, matching the grandfathered scanner-cursor exception (`packages/plgg-md/src/Block/usecase/parseBlocks.ts` lines 137-148)
- Generic combinator typing under `erasableSyntaxOnly`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and the no-`as` rule is the hardest part of this ticket; prefer annotated callback params and `isX`/`asX` narrowing over clever conditional types (CLAUDE.md; `plgg-coding-style`)
- plgg-parser sits LOW in the dependency stack: it must never import from `plgg-highlight`, `plgg-md`, `plgg-view`, `plgg-kit`, `plgg-foundry`, or `example` — single upward dependency direction (`.workaholic` architecture constraints)
- Prefer branded `Str`/`asStr` over `SoftStr` in new code and docs/examples where practical (project memory: Str over SoftStr)
- plgg-bundle's surface `require()` needs default/typed exports done the sibling way — copy the plgg-highlight export map verbatim rather than inventing one (project memory: ESM-only packages break plgg-bundle's surface require)
- `plggmatic` re-export wiring is NOT needed here — plgg-parser is consumed by plgg-highlight internally; revisit only if a guide page wants to import it directly (`packages/plggmatic/src/index.ts`)
- Unicode identifiers (non-ASCII names, `\u` escapes) are explicitly out of the demo gate; note as a known limitation in the demo spec so the migration ticket can decide fidelity (`packages/plgg-highlight/src/Token/usecase/tokenize.ts`)
- The TS-lexer demo grammar stays inside plgg-parser as spec/demo code; the production TS grammar lands in plgg-highlight with the migration ticket `20260704015134-migrate-plgg-highlight-to-plgg-parser.md` — do not ship half a migration here (sacrificial-architecture boundary)
