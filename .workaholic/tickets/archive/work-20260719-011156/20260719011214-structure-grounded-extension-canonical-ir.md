---
created_at: 2026-07-19T01:12:14+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Added
depends_on: [20260719011212-frame-simulation-totality-composition.md, 20260719011213-requirement-model-checker.md]
mission: build-the-plgg-ir-thesis-evaluator
---

# Phase 5a: structure-level grounded extension + canonical IR

## Overview

Pass ⑤ (design.md §6): at the `ストラクチャー` level, compute the **Dung
grounded extension** over the attack graph (survival judgment), and emit
the **canonical versioned IR** with deterministic idempotent normalization
(design.md §5.12, §6).

## Key files

- `packages/plgg-ir-thesis/src/domain/usecase/` — grounded-extension
  computation + normalizer/serializer.
- `packages/plgg-ir-language/` — reuse its normalization + canonical
  serializer machinery.

## Approach

- **Survival semantics (§5.12):** Dung **grounded extension** over the
  attack graph at the structure level — the least fixed point of the
  characteristic function (defended arguments), **polynomial**. Yields the
  surviving set of theses.
- **Canonical IR (§6):** serialize to `(plgg-ir-thesis 1 …)` with
  **deterministic, idempotent** normalization — the same property-test
  obligation as the manifest: `normalize ∘ normalize = normalize`.
  Dependency direction preserved; **no changes to `plgg-ir-manifest`**.

## Quality Gate

- **Acceptance (design.md acceptance items 7 + 8):** the three-thesis
  catalog case yields the **specified surviving set** under the grounded
  extension. The canonical `(plgg-ir-thesis 1 …)` normalization is
  **deterministic and idempotent** under property tests
  (`normalize ∘ normalize = normalize`); `plgg-ir-manifest` is unchanged
  (diff shows none); dependency direction preserved.
- Grounded-extension computation is polynomial (fixed-point, not search).
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green; >90%
  coverage; no `as`/`any`/`ts-ignore`.

## Policies

- `workaholic:implementation` / `type-driven-development`,
  `objective-documentation` (idempotence is a property test).
- `workaholic:design` / `dont-clone-garbage` (reuse the language layer's
  normalization/serializer).
