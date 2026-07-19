---
created_at: 2026-07-19T01:12:09+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash:
category: Added
depends_on: [20260719011208-thesis-syntax-japanese-tokenizer.md]
mission: build-the-plgg-ir-thesis-evaluator
---

# Phase 1b: scaffold plgg-ir-thesis with the closed thesis vocabulary

## Overview

Create `plgg-ir-thesis`, the second dialect on `plgg-ir-language` (sibling
to `plgg-ir-manifest`; design.md §1/§6). This ticket delivers the package
scaffold plus the **closed vocabulary** layer: register the thesis forms,
attributes, and attack types on the language layer so that unknown
forms/attributes are rejected and each assertion's logic kind is validated.

## Key files

- New `packages/plgg-ir-thesis/` — mirror `plgg-ir-manifest`'s structure
  (`src/domain/{model,usecase}`, `index.ts`); follow the family scaffold
  conventions (no `type:module`, `rootDir: src`, printWidth 50, plgg-test
  >90%, README + root index, build.sh/npm-install.sh/check-all wiring,
  vendor-boundary clean).
- `packages/plgg-ir-language/` — reuse whole (forms/operators, scopes,
  typed references, diagnostics, normalization, canonical serializer,
  dialect composition). **No changes to `plgg-ir-manifest`.**

## Approach

- Register the closed vocabulary (design.md §4): forms `主張`/`概念`/`関係`/
  `フレーム`/`文脈`/`論旨`/`論評`/`ストラクチャー`; attributes `:ロジック`/
  `:ルート`/`:接続元`/`:接続先`/`:種別`/`:要求`/`:立場`/`:対象`/`:時点`/
  `:量`/`:種`/`:重み`; attack types `反駁`/`切り崩し`/`掘り崩し`. The seven
  logic kinds (design.md §3): `因果的`/`構成的`/`時間的`/`推移的`/`移動的`/
  `勾配的`/`演繹的`.
- Pass ①: vocabulary + reference closure — reject unknown forms/attributes
  with a ranged diagnostic; enforce **assertion uniformity** (all relations
  of one `主張` carry the single declared `:ロジック`; mixed kinds are a
  compile error, design.md §3).
- `:重み`/`:客観性` parse and are carried as **inert annotations** (v1;
  design.md §5 item 13 — graded semantics is a follow-on mission).

## Quality Gate

- **Acceptance:** the design.md §4 reference example parses into the thesis
  model; an **unknown form/attribute** is rejected with a ranged diagnostic
  naming it; a `主張` mixing two logic kinds across its relations is a
  **compile error**. Specs cover accept + each rejection.
- New `packages/plgg-ir-thesis` builds and is wired into
  build.sh/npm-install.sh/check-all.sh; runtime dep set is `plgg` +
  `plgg-ir-language` + `plgg-ir-syntax` (pinned like manifest);
  `plgg-ir-manifest` untouched (diff shows no change).
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green; >90%
  coverage; no `as`/`any`/`ts-ignore`.

## Policies

- `workaholic:implementation` / `type-driven-development` (closed unions +
  exhaustive `match` for forms/logic kinds), `directory-structure`,
  `domain-layer-separation`.
- `workaholic:design` / `vendor-neutrality`; `dont-clone-garbage` (reuse
  the language layer + mirror manifest, don't copy it verbatim).
