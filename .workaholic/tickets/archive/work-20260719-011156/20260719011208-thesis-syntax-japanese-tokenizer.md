---
created_at: 2026-07-19T01:12:08+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Changed
depends_on:
mission: build-the-plgg-ir-thesis-evaluator
---

# Phase 1a: extend plgg-ir-syntax to tokenize Japanese symbols/keywords

## Overview

The thesis dialect's surface vocabulary is Japanese (design.md §4: forms
`主張`/`概念`/`関係`/`フレーム`/`文脈`/`論旨`/`論評`/`ストラクチャー`,
attributes `:ロジック`/`:ルート`/`:接続元`/… , attack types
`反駁`/`切り崩し`/`掘り崩し`). Today `plgg-ir-syntax`'s tokenizer
(`src/domain/usecase/tokenize.ts`, ~526 lines) recognizes a **closed
ASCII alphabet** ("ASCII letters and digits", comments ~127–129); a
non-ASCII character is treated as an *unexpected character*, skipped with
a lexical diagnostic (~line 70). So Japanese identifiers/keywords do not
tokenize yet — this ticket extends the lexer (design.md §4 "Prerequisite").

## Key files

- `packages/plgg-ir-syntax/src/domain/usecase/tokenize.ts` — the scanner;
  the ident/symbol character predicate and the unexpected-character path.
- `packages/plgg-ir-syntax/src/domain/model/SourceRange.ts`,
  `LineIndex.ts` — position tracking (must count **code points**, not
  UTF-16 units, consistently).
- `tokenize.spec.ts`, `parseSexps.spec.ts`, `printSexp.spec.ts` — extend.

## Approach

- Admit the metamodel's Japanese letters (kanji, kana) and the required
  full-width forms as **identifier/keyword characters**, alongside the
  existing ASCII alphabet — keeping the grammar small and regular
  (design.md §34 spirit: a closed alphabet, not "any Unicode").
- Ensure `:`-prefixed attribute keywords with Japanese names
  (`:ロジック`, `:接続元`, …) tokenize as keyword tokens.
- Position tracking counts Unicode **code points** uniformly, so
  `SourceRange`/`LineIndex` are correct for multibyte input.

## Quality Gate

- **Acceptance:** the reference example in design.md §4 (the 撤退論/継続論
  `(主張 …)` + `(フレーム …)` block) tokenizes and parses with **no
  unexpected-character diagnostics**, and a **parse → print round-trip**
  reproduces the source (positions correct, code-point-based). Add specs
  over Japanese forms, `:`-keywords, and mixed ASCII/Japanese tokens.
- Existing ASCII tokenizer behavior is unchanged (all current
  `plgg-ir-syntax` specs stay green); no regression in `plgg-ir-manifest`
  (which parses through the same syntax layer).
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green (invoke with
  `./`, not `bash`, so `-eu` is honored); >90% coverage; no
  `as`/`any`/`ts-ignore`.

## Policies

- `workaholic:implementation` / `type-driven-development`,
  `domain-layer-separation` (the lexer is a pure usecase over the syntax
  model); `objective-documentation` (round-trip is a checkable property).
- `workaholic:design` / `vendor-neutrality` (no new dep — use the
  platform's Unicode facilities already available).
