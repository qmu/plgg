---
type: Mission
title: Build the plgg-ir-thesis Evaluator
slug: build-the-plgg-ir-thesis-evaluator
status: active
created_at: 2026-07-17T01:43:30+09:00
author: a@qmu.jp
assignee:
tickets: []
stories: []
concerns: []
---

# Build the plgg-ir-thesis Evaluator

## Goal

Build `plgg-ir-thesis`: the second dialect on `plgg-ir-language`
(sibling to `plgg-ir-manifest`) and its **evaluator** — a static
verifier for argumentation structures written in the qmu conceptual
metamodel's vocabulary (主張 / 概念 / 関係 / フレーム / 文脈 / 論旨 /
論評 / ストラクチャー, Japanese surface keywords).

An LLM declares concepts, relations, assertions, and frames between
assertions; the evaluator model-checks the declared structure and
accepts it or rejects it with counterexample diagnostics. The
motivating check — **"does assertion A rebut assertion B exhaustively?"**
— becomes decidable in two selectable senses: 被覆 (coverage: every
relation of B is attacked) and 遮断 (severing: the attacked set cuts
every premise→root derivation path).

The semantics is modal logic over finite Kripke models with model
checking — never satisfiability search: correspondences (attack maps,
analogies, framework bindings) are always declared by the writer and
only checked by the compiler, keeping every pass polynomial and every
rejection accompanied by a concrete counterexample (a surviving
derivation path, an unattacked relation, an uncovered problem node).
This extends the plgg-ir safety boundary from domain models to
argumentation: the AI never claims completeness in prose, only in a
form the compiler can refute.

Design notes: [design.md](design.md). Originating discussion and the
full verification catalog with IR sketches for all cases:
[メタモデルの形式意味論](https://strategy.qmu.dev/metamodel-semantics)
and [なぜ DSL か](https://strategy.qmu.dev/metamodel-dsl) in the
qmu.app strategy book.

## Scope

**Done when** the dialect compiles the reference examples (design.md
§4, and the thirteen catalog cases of §5) with the specified
accept/reject outcomes and counterexample diagnostics, under the house
style (>90% coverage, `Option`/`Result`, exhaustive `match`, no
`as`/`any`/`ts-ignore`), with a documentation guide page.

In scope:

- **Phase 1 — Syntax prerequisite + vocabulary**: audit
  `plgg-ir-syntax` tokenizer for non-ASCII (Japanese) symbols and
  keywords, extend if needed; register the thesis forms and attributes
  as a closed vocabulary on `plgg-ir-language`.
- **Phase 2 — Assertion-level verification**: logic uniformity per
  assertion; per-logic frame conditions (時間的: acyclicity + `:時点`
  monotonicity; 構成的: partial order; 移動的: transfer conservation
  with declared 変換 escapes; `:種` sort exclusivity).
- **Phase 3 — Frame-level verification**: reference closure for attack
  targets (straw-man rejection as a binding error), attack typing
  (反駁 → root / 切り崩し → logic / 掘り崩し → relation), declared
  simulation conditions (類推), framework totality (全対応), frame
  composition commutativity (可換 / 合成).
- **Phase 4 — Model checker**: `:要求` evaluation with counterexample
  traces — 被覆, 遮断, circular-reasoning detection (¬⟨依存*⟩self),
  intra-stance consistency, blind-spot detection (多面性 n).
- **Phase 5 — Structure level + acceptance**: Dung grounded extension
  over the attack graph (survival judgment); canonical
  `(plgg-ir-thesis 1 ...)` IR with deterministic idempotent
  normalization; end-to-end acceptance over the thirteen catalog cases;
  guide page under `docs/`.

Out of scope:

- Truth or content evaluation — the evaluator judges the shape of
  arguments, never whether an attack semantically succeeds (symbol
  grounding stays with the reader, per the metamodel).
- Search for rebuttal mappings or simulations (NP-hard); the writer
  declares, the compiler checks.
- Weighted / gradual argumentation semantics — `:重み` and `:客観性`
  are carried as inert annotations in v1; graded-modal semantics is a
  follow-on mission.
- Natural-language → IR generation loops, and any consumer/UI work
  (interpreting verified theses is follow-on, plggmatic-style).

## Acceptance

<!-- Ticket filenames are appended to each item as the tickets are cut at /ticket time. -->

- [ ] `plgg-ir-syntax` tokenizes Japanese symbols/keywords with correct
      source positions; parse–print round-trip holds for the reference
      examples
- [ ] Thesis vocabulary is closed: unknown forms/attributes are
      rejected; assertions with mixed logic kinds are compile errors
- [ ] Per-logic frame conditions enforced: a cyclic 時間的 assertion,
      a non-monotonic `:時点` sequence, an unbalanced 移動的 transfer
      (without declared 変換), and a `:種`-mixed assertion are each
      rejected with the expected diagnostic
- [ ] Attack reference closure: an attack on an undeclared relation is
      a binding error naming the declared alternatives (straw-man case)
- [ ] Rebuttal completeness under `(被覆 関係)` and `(遮断 前提→ルート)`:
      the 撤退論/継続論 example accepts complete frames and, with one
      attack removed, rejects with "unattacked r3" (被覆) and
      "surviving path 競合参入 →r3→ 撤退判断" (遮断) respectively
- [ ] Framework totality (全対応), circular reasoning, intra-stance
      contradiction, blind-spot (多面性), analogy simulation, and frame
      composition commutativity each accept/reject their catalog case
      with a counterexample diagnostic
- [ ] Dung grounded extension computed at the structure level; the
      three-thesis catalog case yields the specified surviving set
- [ ] Canonical `(plgg-ir-thesis 1 ...)` IR: deterministic, idempotent
      normalization under property tests; no changes to
      `plgg-ir-manifest`; dependency direction preserved
- [ ] Documentation guide page published under `docs/` alongside the
      plgg-ir guide

## Changelog

<!-- Append-only, dated timeline relating this mission's tickets and reports over time.
     One line per event ("- YYYY-MM-DD — event — filename"); never rewrite past lines. -->

- 2026-07-17 — Mission created from the strategy-book metamodel formal-semantics discussion (modal-logic semantics, 13-case verification catalog, Japanese-keyword IR sketches); condensed design captured in design.md
