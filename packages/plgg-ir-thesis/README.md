# plgg-ir-thesis

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

**The Thesis dialect of the `plgg-ir` family** — the second dialect
built with [plgg-ir-language](../plgg-ir-language/) over
[plgg-ir-syntax](../plgg-ir-syntax/), sibling to
[plgg-ir-manifest](../plgg-ir-manifest/). Where the manifest dialect
lets an LLM declare a *domain model* the compiler accepts or rejects,
the thesis dialect lets an LLM declare an *argumentation structure* —
concepts, relations, assertions, and frames between assertions — that
the evaluator statically model-checks and accepts, or rejects with a
counterexample diagnostic.

```
plgg ── plgg-ir-syntax ── plgg-ir-language ── plgg-ir-thesis
                                          └── plgg-ir-manifest
```

## The vocabulary (Japanese surface keywords)

The conceptual metamodel is written in Japanese, so the closed
vocabulary follows it. Top-level forms are `主張` (assertion) and
`フレーム` (frame); `概念` (concept), `関係` (relation), and `攻撃`
(attack) are their nested vocabulary.

```lisp
(主張 撤退論
  :ロジック 因果的
  :ルート (概念 撤退判断)
  (関係 r1 :接続元 (概念 需要縮小) :接続先 (概念 売上減))
  (関係 r2 :接続元 (概念 売上減)   :接続先 (概念 撤退判断))
  (関係 r3 :接続元 (概念 競合参入) :接続先 (概念 撤退判断)))

(フレーム 継続論による反論
  :種別 反論
  :接続元 継続論
  :接続先 撤退論
  :要求 (遮断 前提→ルート)          ; or (被覆 関係)
  (攻撃 s1 掘り崩し r1)
  (攻撃 s2 切り崩し r2)
  (攻撃 s3 掘り崩し r3))
```

An assertion (`主張`) is a finite Kripke model with a root state: it
declares a single `:ロジック` (one of the seven logic kinds — `因果的`
`構成的` `時間的` `推移的` `移動的` `勾配的` `演繹的`), a `:ルート`
concept, and the concepts and relations of its argument graph. Every
relation shares the assertion's logic kind — **uniformity** (a relation
carrying a divergent `:ロジック` is a compile error).

A frame (`フレーム`) relates whole assertions; its `(攻撃 ...)` clauses
declare typed attacks (`反駁` rebut / `切り崩し` undercut / `掘り崩し`
undermine), and its `:要求` names the model-checking requirement.

## Status

Pass ① — the closed vocabulary, structural parse, and assertion
uniformity — is implemented (`compileThesis`). The verification passes
(per-logic frame conditions, attack reference closure and typing, frame
simulation / totality / composition, the `:要求` model checker with
counterexample traces, the Dung grounded extension, and the canonical
`(plgg-ir-thesis 1 ...)` IR) are built up over the remaining tickets of
the `build-the-plgg-ir-thesis-evaluator` mission.

`plgg-ir-manifest` is never touched: the two dialects compose on the
shared language layer.

## Usage

```typescript
import { compileThesis } from "plgg-ir-thesis";

const result = compileThesis(source); // Result<CompiledThesis, SemDiagnostic[]>
```

Every rejection comes back as a ranged, coded diagnostic — never a
throw, never a bare boolean.
