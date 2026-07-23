---
created_at: 2026-07-04T01:51:34+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Config]
effort: 2h
commit_hash:
category: Changed
depends_on: [20260704015133-create-plgg-parser-combinator-library.md]
---

# Migrate plgg-highlight tokenization from ts.createScanner to plgg-parser

## Overview

Replace `plgg-highlight`'s TypeScript-compiler-driven tokenizer (`ts.createScanner` in an imperative while-loop) with a TS-lexer grammar built on the new `plgg-parser` combinator library, and drop `typescript` from plgg-highlight's peerDependencies. This completes the motivation for plgg-parser: highlighting `<pre></pre>`-wrapped TypeScript with our own zero-dependency parsing stack instead of the TypeScript compiler.

The public surface must not change: `tokenize(code): Token[]` keeps its signature, the 9-variant `TokenKind` taxonomy stays, the exact-source round-trip invariant holds (skipTrivia-equivalent behavior: every character of input appears in exactly one token), and the entry point never throws (irregular input degrades to `plain` tokens). The `Highlighter` seam (`asHighlighter()`) and everything downstream (plgg-md, plggmatic, plggpress, guide) must be observably unaffected.

**Note on Quality Gate provenance**: the developer was away during the ticket-time interrogation; the Quality Gate below records the interrogation's recommended defaults. The "scanner parity" corpus check was offered but not selected — the gate here is the existing spec suite unchanged plus the three hard edge cases; strengthen to full parity if desired before `/drive` approval.

## Policies

The standard engineering policies that govern this ticket. The implementing session MUST read each linked policy hard copy before writing code and keep every change defensible against that policy's Goal (目標), Responsibility (責務), and Practices (実践).

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout (applies to all code work)
- `workaholic:implementation` / `policies/coding-standards.md` — TypeScript/style conventions; no `as`/`any`/`ts-ignore` while re-typing the tokenizer
- `workaholic:implementation` / `policies/type-driven-design.md` — the grammar's state (last-significant-token context for regex-vs-division) should be typed so illegal lexer states are unrepresentable
- `workaholic:implementation` / `policies/functional-programming.md` — the combinator grammar replaces an imperative scanner loop; keep any residual cursor seam documented
- `workaholic:implementation` / `policies/test.md` — existing specs are the regression net; they must pass unchanged
- `workaholic:design` / `policies/vendor-neutrality.md` — the point of the ticket: removes the `typescript` peerDependency from the published highlight surface
- `workaholic:design` / `policies/sacrificial-architecture.md` — the scanner-backed tokenizer is the sacrificial part being replaced behind a stable `tokenize` contract; keep the swap revertible in one commit

## Key Files

- `packages/plgg-highlight/src/Token/usecase/tokenize.ts` - the `ts.createScanner` while-loop to replace with a plgg-parser grammar
- `packages/plgg-highlight/src/Token/usecase/tokenize.spec.ts` - the regression net: kind-tag sequences and exact source round-trip; must pass unchanged
- `packages/plgg-highlight/src/Token/model/Token.ts` - `TokenKind` taxonomy and `Token` shape; unchanged public model
- `packages/plgg-highlight/src/Render/usecase/highlight.ts` - downstream consumer (TokenKind → CSS class fold); must be observably unaffected
- `packages/plgg-highlight/package.json` - remove `typescript` from peerDependencies; add `plgg-parser` (`file:../plgg-parser`); keep `typescript` as devDependency (still needed for `tsc --noEmit`)
- `packages/plgg-highlight/bundle.config.ts` - externals derive from package.json; verify `plgg-parser` externalizes correctly and the typescript external disappears
- `packages/plgg-md/src/Render/model/seam.ts` - the `Highlighter` seam contract that must keep holding
- `packages/plggmatic/src/index.ts` - re-exports plgg-highlight; consumer whose fresh rebuild verifies no drift
- `scripts/check-all.sh` - the fresh-rebuild gate that catches stale-dist masking across plggmatic/plggpress/guide

## Related History

plgg-highlight was created around `ts.createScanner` precisely because no in-house parser existed; this ticket removes that compromise now that plgg-parser does.

Past tickets that touched similar areas:

- [20260630013503-plgg-highlight-ts-scanner.md](.workaholic/tickets/archive/work-20260630-013457/20260630013503-plgg-highlight-ts-scanner.md) - Created the scanner-based tokenizer, the taxonomy, the round-trip invariant, and the no-throw fallback this migration must preserve
- [20260630013502-plgg-md-inline-fold-to-html.md](.workaholic/tickets/archive/work-20260630-013457/20260630013502-plgg-md-inline-fold-to-html.md) - Defines the Highlighter seam this migration must leave intact

## Implementation Steps

1. Read the plgg-parser demo TS-lexer grammar (from the prerequisite ticket) and promote it into `plgg-highlight` as the production grammar under `src/Token/` — the generic library stays TS-agnostic; the TS grammar lives with its consumer.
2. Extend the grammar to full `tokenize` fidelity for the shipped taxonomy: keywords (the existing keyword set), identifiers, numbers (incl. bigint/hex/binary/octal/separators as currently classified), strings with escapes, template literals with nested `${}` interpolation, line/block comments, punctuation, regex literals (context-disambiguated from division via the last-significant-token state), whitespace/trivia preserved so round-trip holds.
3. Swap `tokenize.ts`'s scanner loop for the grammar; keep the signature `(code) => Token[]` and the never-throw guarantee (grammar-level failure degrades the remainder to `plain` tokens rather than erroring the entry point).
4. `package.json`: add `plgg-parser` dependency (`file:../plgg-parser`), remove `typescript` from peerDependencies (retain as devDependency for `tsc --noEmit`); update `bundle.config.ts` expectations if externals change; re-run the workspace install path.
5. Add edge-case specs alongside the existing suite: nested template interpolation, regex-vs-division pairs (`a / b / c`, `/re/g.test(x)`, `(a) / b`, `return /re/`), unterminated comment/string/template at EOF (no throw, plain degradation), and keep every existing assertion untouched.
6. Fresh rebuild verification: `scripts/check-all.sh` (stale dists mask type drift in consumers — this must be the fresh-rebuild path) and a guide render spot-check that a highlighted TS block still produces the same classified spans.

## Quality Gate

How the outcome's quality is assured. `/drive` surfaces this in its approval prompt; approval is against this pre-agreed gate. (Recorded from the interrogation's recommended defaults — developer was AFK; adjust before approval if wrong.)

**Acceptance criteria** — the checkable conditions that must hold:

- `packages/plgg-highlight/src/Token/usecase/tokenize.ts` no longer imports `typescript`; `grep -rn "from \"typescript\"\|from 'typescript'" packages/plgg-highlight/src` finds nothing.
- `package.json` has no `typescript` in `peerDependencies` and lists `plgg-parser` in `dependencies`.
- Every pre-existing assertion in `tokenize.spec.ts` (and the rest of the plgg-highlight suite) passes without modification — the kind-tag sequences and exact-source round-trip are the parity proof.
- New edge-case specs pass: nested template interpolation balanced, regex-vs-division classified correctly in the listed contexts, unterminated constructs at EOF yield plain-degraded tokens (entry point never throws).
- plgg-highlight coverage stays >90% on all four metrics.
- Zero type escapes introduced (`as`/`any`/`ts-ignore` grep clean over the diff).

**Verification method** — the commands/tests/probes that prove them:

- `scripts/tsc-plgg-highlight.sh` and `scripts/test-plgg-highlight.sh` — clean compile, suite green with unchanged legacy assertions.
- `scripts/coverage-plgg-highlight.sh` — >90% maintained.
- `scripts/check-all.sh` — fresh rebuild green across plggmatic/plggpress/guide (catches stale-dist masking).
- The typescript-import and type-escape greps above.

**Gate** — what must pass before approval:

- All commands above green, the legacy spec suite untouched-and-passing, the typescript peerDependency gone, and a guide page with a highlighted TS block rendering identically (spot-check in-session).

## Considerations

- Behavior parity is judged by the existing spec suite, not by byte-identical classification with `ts.createScanner` in every exotic case; if a corpus-level parity check is wanted, strengthen this gate before approval (`packages/plgg-highlight/src/Token/usecase/tokenize.spec.ts`)
- `typescript` must remain a devDependency — `tsc --noEmit` is the test command's first half; only the peerDependency (the published runtime surface) is removed (`packages/plgg-highlight/package.json`)
- Long `<pre>` blocks: the grammar must lex multi-hundred-line files without stack growth — relies on the prerequisite ticket's iterative `many` seam (`packages/plgg-parser`)
- Unicode identifiers and `\u` escapes in identifiers: decide fidelity here (the scanner handled them for free; the grammar may initially classify them as plain) and record the decision in the spec (`packages/plgg-highlight/src/Token/usecase/tokenize.ts`)
- JSX/TSX: the current scanner-based tokenize treats TSX via the same scanner; verify what the shipped normalizeLang dispatches and keep whatever fidelity exists today (`packages/plgg-highlight/src/Lang/`)
- Keep the swap one revertible commit: if the grammar proves unready, reverting restores the scanner path without touching consumers (sacrificial-architecture)
- Cross-reference: prerequisite `20260704015133-create-plgg-parser-combinator-library.md` delivers the combinator core, the user-state threading needed for regex-vs-division, and the iterative `many` seam this ticket depends on
