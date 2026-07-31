# plgg-ir-thesis — Design Notes

Condensed design for the argumentation dialect and its evaluator. The
originating discussion lives in the qmu.app strategy book:
[メタモデルの形式意味論](https://strategy.qmu.dev/metamodel-semantics)
(full verification catalog and IR sketches) and
[なぜ DSL か](https://strategy.qmu.dev/metamodel-dsl) (why a DSL rather
than YAML). The conceptual metamodel itself is at
[概念メタモデル](https://strategy.qmu.dev/metamodel).

## 1. Purpose

`plgg-ir-thesis` is the second dialect on `plgg-ir-language`, sibling
to `plgg-ir-manifest`. Where the manifest dialect lets an LLM declare a
*domain model* the compiler can accept or reject, the thesis dialect
lets an LLM declare an *argumentation structure* — concepts, relations,
assertions, frames between assertions — that the evaluator statically
verifies. The motivating check: **"does assertion A rebut assertion B
exhaustively?"** becomes a decidable model-checking problem with
counterexample diagnostics.

Same safety boundary as the manifest: the AI never asserts "this
argument is complete" in prose; it declares a structure the compiler
accepts, or rejects with a machine-correctable counterexample.

## 2. Semantics: modal logic, not predicate-logic nondeterminism

The formal footing is **modal logic over finite Kripke models, checked
by model checking** — never satisfiability search, unification, or
unrestricted quantification.

- Concepts are states (worlds) with propositional labels; relations are
  accessibility relations typed by their logic kind; an assertion is a
  finite Kripke model with a root state.
- By van Benthem's characterization theorem, modal logic is exactly the
  bisimulation-invariant fragment of first-order logic — so every
  expressible property is content-independent by construction, which is
  what the metamodel demands of frameworks ("同型的に包摂").
- Frames between assertions are **simulations / bisimulations**, not
  isomorphisms. Checking a *declared* simulation is polynomial;
  *searching* for one is NP-hard — hence the dialect's rule that the
  LLM always declares the correspondence and the compiler only checks
  it (declare-and-reject, as everywhere in plgg-ir).
- Model checking returns **counterexample traces** (a surviving
  derivation path, an unattacked relation, an uncovered problem node),
  which map directly onto plgg-ir's ranged-diagnostic error model.

## 3. The seven logic kinds and their frame conditions

| Logic (ロジック) | Modal system | Static frame condition |
| --- | --- | --- |
| 因果的 (causal) | basic K | directedness only |
| 構成的 (constitutive) | S4-like part-whole | transitivity, partial order |
| 時間的 (temporal) | GL (Löb) / CTL on DAGs | acyclicity (the metamodel's "DAG" requirement *is* the GL frame condition) + timestamp monotonicity |
| 推移的 (transitive) | PDL programs (`;`, `∪`, `*`) | transition typing, path checks |
| 移動的 (transfer) | multi-agent dynamic | conservation of transferred quantities |
| 勾配的 (gradient) | graded modal logic (`◇≥k`) | numeric attributes, unit coherence |
| 演繹的 (deductive) | propositional core | boolean consistency |

An assertion must be **uniform**: all its relations carry the single
logic kind declared by the assertion (mixed kinds are compile errors).

## 4. Surface vocabulary (Japanese keywords)

The metamodel is written in Japanese; the closed vocabulary follows it.
Forms: `主張` `概念` `関係` `フレーム` `文脈` `論旨` `論評`
`ストラクチャー`. Attributes: `:ロジック` `:ルート` `:接続元`
`:接続先` `:種別` `:要求` `:立場` `:対象` `:時点` `:量` `:種`
`:重み`. Attack types: `反駁` (rebut, targets the root concept),
`切り崩し` (undercut, targets the logic application), `掘り崩し`
(undermine, targets a premise/relation).

**Prerequisite**: audit `plgg-ir-syntax`'s tokenizer for non-ASCII
symbols and keywords; extend if needed (position tracking must count
code points consistently).

Reference example (the motivating case):

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

Removing `(攻撃 s3 …)` must produce, under `遮断`: "derivation path
競合参入 →r3→ 撤退判断 survives", and under `被覆`: "r3 has no declared
attack".

## 5. The verification catalog

Thirteen checks, each with a counterexample shape. Full IR sketches for
every case are in the strategy book page; summarized:

1. **Rebuttal completeness** — two orthogonal notions selectable via
   `:要求`: `被覆` (coverage: every relation of the target is attacked)
   and `遮断` (severing: the attacked set cuts every premise→root
   derivation path). Default `遮断`.
2. **Framework totality** (`全対応`) — problem→countermeasure→
   verification: `□(問題 → ⟨対策⟩⊤)`; counterexample names the
   unaddressed node.
3. **Circular reasoning** — no assertion may depend on itself through
   the context graph (`¬⟨依存*⟩self`).
4. **Intra-stance consistency** — reject `□ₛp ∧ □ₛ¬p` within one
   stance; conflicts *across* stances are surfaced, not rejected.
5. **Blind-spot detection** (`多面性 n`) — every concept reachable from
   ≥ n stances.
6. **Straw-man rejection** — attacks may only reference declared
   relations of the target assertion (reference closure; a binding
   error, not a lint).
7. **Analogy soundness** (`類推`) — a declared simulation between
   assertions from different domains is checked for the local
   simulation condition.
8. **Temporal coherence** — GL acyclicity plus `:時点` monotonicity;
   stale-assertion detection via dependency tracking.
9. **Transfer conservation** — inflow/outflow accounting per node,
   with declared `変換` (transformation) escapes.
10. **Sort exclusivity** (`:種`) — stakeholder kinds (生物/無生物/
    物質/観念) may not mix within one assertion.
11. **Frame-composition commutativity** (`可換`/`合成`) — declared
    composite frames must agree with the composition of their parts.
12. **Survival semantics** — Dung grounded extension over the attack
    graph at the structure (ストラクチャー) level; polynomial.
13. **Weights** (`:重み` `:客観性`) — parsed and carried as inert
    annotations in v1; graded-modal semantics is explicitly future
    work.

## 6. Architecture

```text
plgg-ir-syntax ── plgg-ir-language ── plgg-ir-thesis   (new)
                                  └── plgg-ir-manifest (existing)
```

- Reuse the language layer whole: forms/operators, scopes, typed
  references, diagnostics, normalization, canonical serializer, dialect
  composition. No changes to `plgg-ir-manifest`.
- Verification passes, in order: ① vocabulary/reference closure,
  ② per-assertion uniformity + logic frame conditions, ③ frame checks
  (simulation, attack typing, totality), ④ `:要求` model checking with
  counterexample traces, ⑤ structure-level grounded extension.
- Canonical IR versioned as `(plgg-ir-thesis 1 ...)`; deterministic and
  idempotent normalization, same property-test obligations as the
  manifest (`normalize ∘ normalize = normalize`).
- House style throughout: `Option` not null, `Result` not throw,
  exhaustive `match`, no `as`/`any`/`ts-ignore`, >90% coverage.

## 7. Non-goals

- No truth or content evaluation — the evaluator judges the *shape* of
  arguments, never whether a counter-relation semantically contradicts
  (symbol grounding stays with the reader, per the metamodel).
- No search for rebuttal mappings (NP-hard); correspondences are always
  declared.
- No weighted/gradual argumentation semantics in v1 (item 13).
- No natural-language → IR generation loop (a consumer concern).
- No consumer/UI work (plggmatic-style interpretation of verified
  theses is follow-on).

## 8. References

- van Benthem — modal logic as the bisimulation-invariant fragment of FO
- Fischer–Ladner — PDL; Solovay/Löb — GL and well-founded frames
- graded modal logic; hybrid logic (nominals for addressing relations)
- Dung (1995) abstract argumentation; ASPIC+ (rebut/undercut/undermine)
- Spivak — ologs (categorical reading of the metamodel)
- In-house precedents: [the plgg-ir guide](../../../docs/plgg-ir/guide.md),
  [qfs language reference](https://github.com/qmu/qfs/blob/main/docs/language.md)
