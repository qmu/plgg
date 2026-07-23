---
created_at: 2026-07-19T01:12:11+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash:
category: Added
depends_on: [20260719011209-thesis-package-and-closed-vocabulary.md]
mission: build-the-plgg-ir-thesis-evaluator
---

# Phase 3a: attack reference closure (straw-man) + attack typing

## Overview

Part of pass ③ (design.md §6, catalog items 6 + the attack-typing rule
§4). A `フレーム` declares attacks (`攻撃`) on a target `主張`; each attack
must reference a **declared relation/target** of that assertion, and its
attack type must match what it may target.

## Key files

- `packages/plgg-ir-thesis/src/domain/usecase/` — the frame binder /
  attack checker.
- The frame + attack model (from the scaffold ticket).

## Approach

- **Reference closure (straw-man rejection, design.md §5.6):** an `攻撃`
  may only reference a **declared** relation/concept of the target
  assertion. An attack on an undeclared relation is a **binding error**
  (not a lint) whose diagnostic **names the declared alternatives**.
- **Attack typing (design.md §4):** `反駁` targets the **root** concept,
  `切り崩し` targets the **logic application**, `掘り崩し` targets a
  **premise/relation** — reject a type→target mismatch with a diagnostic.

## Quality Gate

- **Acceptance (design.md acceptance item 4):** an attack on an
  **undeclared relation** is a **binding error** whose message names the
  declared alternatives (the straw-man case). A `反駁`/`切り崩し`/`掘り崩し`
  aimed at the wrong kind of target is rejected; correctly-typed attacks on
  declared targets are accepted. Specs cover each.
- Diagnostics are ranged and reference-closed through the language layer's
  typed-reference machinery (reused, not re-implemented).
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green; >90%
  coverage; no `as`/`any`/`ts-ignore`.

## Policies

- `workaholic:implementation` / `type-driven-development` (attack types a
  closed union; targets typed), `objective-documentation`.
- `workaholic:design` / `dont-clone-garbage` (reuse the language layer's
  typed references + diagnostics).
