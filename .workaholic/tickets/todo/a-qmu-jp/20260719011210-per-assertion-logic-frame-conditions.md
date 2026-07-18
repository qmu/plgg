---
created_at: 2026-07-19T01:12:10+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Added
depends_on: [20260719011209-thesis-package-and-closed-vocabulary.md]
mission: build-the-plgg-ir-thesis-evaluator
---

# Phase 2: per-assertion uniformity + per-logic frame conditions

## Overview

Pass ② (design.md §6): after vocabulary/uniformity, verify each `主張`'s
declared logic kind against its **static frame condition** (design.md §3
table). This is model checking over the assertion's finite Kripke model,
polynomial, with a concrete counterexample on rejection.

## Key files

- `packages/plgg-ir-thesis/src/domain/usecase/` — new per-logic checkers.
- The thesis model from the scaffold ticket (assertion = Kripke model with
  a root state; relations typed by logic kind).

## Approach

Implement the frame conditions from design.md §3, each rejecting with a
ranged counterexample diagnostic:

- **時間的** (GL/CTL on DAGs): **acyclicity** of the relation graph
  (the metamodel's DAG requirement *is* the GL frame condition) **plus
  `:時点` monotonicity** along edges.
- **構成的** (S4-like part-whole): transitivity + **partial order**
  (no antisymmetry violation).
- **移動的** (transfer): **conservation** of transferred `:量` per node
  (inflow = outflow) except across declared `変換` (transformation)
  escapes.
- **`:種` sort exclusivity**: stakeholder kinds (生物/無生物/物質/観念)
  may **not mix** within one assertion.
- (因果的 = directedness only; 推移的/勾配的/演繹的 conditions per §3 as
  the model requires — carry `勾配的` numeric/unit coherence minimally,
  since graded semantics is v1-inert.)

## Quality Gate

- **Acceptance (design.md acceptance item 3):** a **cyclic 時間的**
  assertion, a **non-monotonic `:時点`** sequence, an **unbalanced 移動的**
  transfer *without* a declared `変換`, and a **`:種`-mixed** assertion are
  each **rejected** with the expected diagnostic (naming the offending
  cycle / edge / node / mixed sorts). A well-formed assertion of each logic
  kind is **accepted**. Specs cover every accept/reject.
- Every check is **polynomial** (model checking, not search) and returns a
  concrete counterexample, never a bare boolean.
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green; >90%
  coverage; exhaustive `match` over the seven logic kinds; no
  `as`/`any`/`ts-ignore`.

## Policies

- `workaholic:implementation` / `type-driven-development` (each logic kind
  a variant with its own checker, exhaustive), `objective-documentation`
  (rejections carry checkable counterexamples).
- `workaholic:design` / `sacrificial-architecture` (the compiler-checked
  structure is the durable safety boundary, per the metamodel).
