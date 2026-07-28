---
created_at: 2026-07-19T01:12:13+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Added
depends_on: [20260719011210-per-assertion-logic-frame-conditions.md, 20260719011211-attack-reference-closure-and-typing.md]
mission: build-the-plgg-ir-thesis-evaluator
---

# Phase 4: `:要求` model checker with counterexample traces

## Overview

Pass ④ (design.md §6): evaluate a frame's `:要求` (requirement) by model
checking, returning a **counterexample trace** on failure — the motivating
capability ("does A rebut B exhaustively?", design.md §1). Covers the two
rebuttal notions plus the remaining catalog checks that are model-checks.

## Key files

- `packages/plgg-ir-thesis/src/domain/usecase/` — the model checker over
  the assertion/attack graph.

## Approach

- **Rebuttal completeness (design.md §5.1), two selectable notions via
  `:要求`:**
  - **`被覆` (coverage):** every relation of the target is attacked;
    counterexample = the **unattacked relation** ("r3 has no declared
    attack").
  - **`遮断` (severing, default):** the attacked set **cuts every
    premise→root derivation path**; counterexample = a **surviving path**
    ("競合参入 →r3→ 撤退判断 survives").
- **Circular reasoning (§5.3):** `¬⟨依存*⟩self` over the context graph —
  no assertion depends on itself transitively.
- **Intra-stance consistency (§5.4):** reject `□ₛp ∧ □ₛ¬p` within one
  `:立場`; cross-stance conflicts are **surfaced, not rejected**.
- **Blind-spot detection (`多面性 n`, §5.5):** every concept reachable
  from ≥ n stances; counterexample names the under-covered concept.

## Quality Gate

- **Acceptance (design.md acceptance item 5 + rest of item 6):** the
  撤退論/継続論 example (design.md §4) **accepts** the complete frame under
  both `(被覆 関係)` and `(遮断 前提→ルート)`; with `(攻撃 s3 …)` **removed**
  it **rejects** with `"unattacked r3"` under 被覆 and
  `"surviving path 競合参入 →r3→ 撤退判断"` under 遮断. Circular reasoning,
  intra-stance contradiction, and blind-spot each accept/reject their
  catalog case with a counterexample. Specs cover every case.
- Every evaluation is polynomial model checking (no satisfiability search)
  and yields a **concrete trace**, never a bare boolean.
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green; >90%
  coverage; no `as`/`any`/`ts-ignore`.

## Policies

- `workaholic:implementation` / `type-driven-development`,
  `objective-documentation` (traces are the checkable output);
  `domain-layer-separation`.
- `workaholic:design` / `sacrificial-architecture` (the compiler refutes;
  the AI never claims completeness in prose).
