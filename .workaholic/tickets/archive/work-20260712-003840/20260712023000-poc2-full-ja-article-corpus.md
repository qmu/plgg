---
created_at: 2026-07-12T02:30:00+09:00
author: a@qmu.jp
type: bugfix
layer: [UX]
effort:
commit_hash: f3c53af3
category: Changed
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# PoC 2 — index the full qmu.co.jp article corpus for Japanese grounding

## Overview

Live judging showed the Japanese answers are evasive per-area summaries. Root
cause verified by grep, not vibes: the vendored `corpus-ja/` holds ONLY the
11 pillar INDEX pages (summaries + links) — not one actual article body. The
question the developer asked (documentation policy) is answered by the real
article `implementation/objective-documentation.md`(客観的な文書化), which
exists in `~/projects/qmu-co-jp/docs` (168 articles, ~1.8 MB) but not in the
snapshot. The agent honestly reported its sources had no such policy —
correct behavior over a too-thin corpus.

## Implementation Steps

1. `buildIndex.ts`: resolve the JA corpus root from candidates — `QMU_DOCS`
   env override, then `~/projects/qmu-co-jp/docs` (the real site source),
   falling back to the vendored `corpus-ja/` index pages so a clean checkout
   still builds. Glob `**/*.md`, log which root won and the payload size.
2. Keep segmenter tokenization and the `qmu.co.jp/<route>` citation links
   (nested paths like `implementation/objective-documentation.md` already
   route correctly).
3. Rebuild, recreate the workload container (preserving the key), and re-run
   the documentation-policy question end-to-end.

## Quality Gate

- tsc + offline specs green (no spec depends on corpus size).
- The documentation question now retrieves real article chunks; the answer
  cites them (or the vocabulary-mismatch limit is reproduced and RECORDED —
  「ドキュメンテーション」 vs the article's 「文書化」 vocabulary is exactly
  the FTS quality gap PoC 1's verdict said would reopen the vector-arm
  question; either outcome is PoC data).
- ja-fts.json payload size logged and stated honestly on the README (a ~1.8 MB
  corpus ships whole in the index — measuring that cost is PoC business).

## Considerations

- The full-corpus build depends on the out-of-repo `qmu-co-jp` checkout; the
  vendored fallback keeps clean-clone builds reproducible (the PoC 1
  reproducibility property, now as a degraded mode instead of the only mode).
