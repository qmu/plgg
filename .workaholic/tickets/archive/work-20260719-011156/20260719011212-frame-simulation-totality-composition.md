---
created_at: 2026-07-19T01:12:12+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Added
depends_on: [20260719011211-attack-reference-closure-and-typing.md]
mission: build-the-plgg-ir-thesis-evaluator
---

# Phase 3b: frame simulation (類推), totality (全対応), composition (可換)

## Overview

The rest of pass ③ (design.md §6): the frame-level checks that relate whole
assertions — declared simulations, framework totality, and composite-frame
commutativity. Every correspondence is **declared by the writer and only
checked** (design.md §2: checking a declared simulation is polynomial;
searching is NP-hard).

## Key files

- `packages/plgg-ir-thesis/src/domain/usecase/` — simulation checker,
  totality checker, composition checker.

## Approach

- **Analogy soundness (`類推`, design.md §5.7):** a declared
  simulation/bisimulation between assertions from different domains is
  checked for the **local simulation condition** (per state, every step is
  matched) — content-independent by van Benthem (§2). Reject with the
  first unmatched step.
- **Framework totality (`全対応`, §5.2):** `□(問題 → ⟨対策⟩⊤)` — every
  problem node has a countermeasure→verification path; the counterexample
  **names the unaddressed node**.
- **Frame-composition commutativity (`可換`/`合成`, §5.11):** a declared
  composite frame must **agree with the composition of its parts**; reject
  with the diverging composite.

## Quality Gate

- **Acceptance (part of design.md acceptance item 6):** the catalog cases
  for analogy simulation, framework totality (全対応), and frame
  composition commutativity (可換/合成) each **accept** their well-formed
  case and **reject** the broken one with the specified counterexample
  (unmatched step / unaddressed node / diverging composite). Specs cover
  each.
- Only **declared** correspondences are checked (no search); every check
  polynomial.
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green; >90%
  coverage; no `as`/`any`/`ts-ignore`.

## Policies

- `workaholic:implementation` / `type-driven-development`,
  `objective-documentation` (counterexamples, not booleans).
- `workaholic:planning` / `verify-before-building` (the simulation checker
  is the subtlest — prove it on the catalog case before generalizing).
