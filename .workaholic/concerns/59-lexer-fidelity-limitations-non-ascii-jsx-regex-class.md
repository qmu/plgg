---
type: Concern
origin_pr: 59
origin_pr_url: https://github.com/qmu/plgg/pull/59
origin_branch: work-20260704-015006
origin_commit: 1de1709
created_at: 2026-07-04T11:02:58+09:00
severity: low
status: active
resolved_by_pr:
resolved_by_commit:
---

# plgg-highlight grammar has cosmetic lexing limitations vs the old scanner

## Description

The plgg-parser TS grammar that replaced `ts.createScanner` in `plgg-highlight/src/Token/usecase/tokenize.ts` classifies a few constructs more coarsely than the compiler scanner did: non-ASCII / `\u`-escaped identifiers colour as `plain` (the ASCII identifier grammar does not match them), and JSX/TSX markup is lexed generically (as it was under the lexical-only scanner). These are cosmetic — they only affect token colour and NEVER break the exact-source round-trip invariant, which the byte-identical legacy `tokenize.spec.ts` still proves. The same limitations are documented in `tokenize.ts`'s header and the `plgg-parser` TS-lexer demo.

## How to Fix

If richer colouring is wanted: extend `identStart`/`identPart` to Unicode ID_Start/ID_Continue ranges, and add a JSX-aware sub-grammar dispatched by `normalizeLang`'s `tsx`/`jsx` tokens. Neither is required for correctness; defer until a guide page demonstrates the miscolouring is worth the grammar complexity.
