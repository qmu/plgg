# The plgg-ir-thesis Guide

`plgg-ir-thesis` is the second dialect on `plgg-ir-language`,
sibling to the [Domain Manifest dialect](./guide.md). Where the
manifest lets an LLM declare a **domain model** the compiler
accepts or rejects, the thesis dialect lets an LLM declare an
**argumentation structure** — concepts, relations, assertions,
and frames between assertions — that the evaluator statically
verifies.

The motivating check — *"does assertion A rebut assertion B
exhaustively?"* — becomes a decidable model-checking problem
with counterexample diagnostics. The safety boundary is the same
as the manifest's: the AI never asserts *"this argument is
complete"* in prose; it declares a structure the compiler
accepts, or rejects with a machine-correctable counterexample.

```text
LLM-generated argumentation source
      ↓  parse            (plgg-ir-syntax)
Position-aware syntax tree
      ↓  expand → analyze → normalize   (plgg-ir-language)
      ↓  thesis verification            (plgg-ir-thesis)
Canonical Thesis IR  —  (plgg-ir-thesis 1 ...)
      ↓  surviving set (Dung grounded extension)
```

Condensed design and the full verification catalog:
[`design.md`](../../.workaholic/missions/active/build-the-plgg-ir-thesis-evaluator/design.md).
Package reference:
[plgg-ir-thesis](../../packages/plgg-ir-thesis/README.md).

## 1. Semantics: model checking, not proof search

The formal footing is **modal logic over finite Kripke models,
checked by model checking** — never satisfiability search or
unrestricted quantification.

- A **concept** (`概念`) is a state; a **relation** (`関係`) is a
  typed accessibility edge; an **assertion** (`主張`) is a finite
  Kripke model with a root state.
- **Frames** (`フレーム`) between assertions are declared
  simulations / attacks, **checked** in polynomial time — the
  writer always declares the correspondence, the compiler only
  checks it (checking a declared simulation is polynomial;
  searching for one is NP-hard).
- Every rejection is a **counterexample**: a surviving derivation
  path, an unattacked relation, an uncovered node — mapped onto
  the ranged diagnostics of `plgg-ir-language`.

## 2. Vocabulary

The metamodel is written in Japanese; the vocabulary follows it
and is closed — unknown forms or attributes are compile errors.

| Form | Meaning |
| --- | --- |
| `主張` | an assertion (a Kripke model with a `:ルート`) |
| `関係` | a relation (a typed edge, `:接続元` → `:接続先`) |
| `概念` | a concept occurrence (inline, unioned by name) |
| `フレーム` | a frame relating two assertions |
| `攻撃` | one attack a `反論` frame declares |
| `対応` | one state correspondence of a `類推` frame |
| `問題` | a problem node named by a `全対応` frame |
| `部分` | a part frame named by a `合成` frame |

| Logic kind (`:ロジック`) | Static frame condition |
| --- | --- |
| `因果的` (causal) | directedness only |
| `構成的` (constitutive) | partial order (acyclic) |
| `時間的` (temporal) | acyclicity + `:時点` monotonicity |
| `推移的` (transitive) | (no structural rejection in v1) |
| `移動的` (transfer) | `:量` conservation, `:変換` escapes |
| `勾配的` (gradient) | (no structural rejection in v1) |
| `演繹的` (deductive) | (no structural rejection in v1) |

An assertion must be **uniform**: every relation carries the
single logic kind the assertion declares.

**Attack types** — `反駁` (rebut, targets the root), `切り崩し`
(undercut) and `掘り崩し` (undermine, both target a relation).
**Frame kinds** (`:種別`) — `反論` (attack), `類推` (analogy),
`全対応` (totality), `合成` (composition), `依存` (dependency).
**Requirement modes** (`:要求`) — `被覆` (coverage), `遮断`
(severing, default), `多面性` (blind-spot).

## 3. The five verification passes

Run in order over the analyzed node list; every violation is a
ranged counterexample, every check polynomial.

1. **Vocabulary / reference closure** — closed forms and
   attributes; attacks reference only declared targets
   (straw-man rejection).
2. **Per-assertion frame conditions** — logic uniformity, plus
   the `:ロジック` table above and `:種` sort exclusivity.
3. **Frame-level checks** — attack typing, declared simulation
   (`類推`), framework totality (`全対応`), composition
   commutativity (`合成`).
4. **Model checking** — `:要求` evaluation (`被覆` / `遮断`),
   circular reasoning (`依存` cycle), intra-stance consistency,
   blind-spot (`多面性`).
5. **Structure level** — the Dung grounded extension over the
   attack graph (the surviving set), and the canonical
   `(plgg-ir-thesis 1 ...)` IR.

## 4. A worked example (design §4)

The 撤退論 (withdrawal) assertion and the 継続論 (continuation)
rebuttal:

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
  :要求 (遮断 前提→ルート)
  (攻撃 s1 掘り崩し r1)
  (攻撃 s2 切り崩し r2)
  (攻撃 s3 掘り崩し r3))
```

**Accepted.** Under `遮断`, the attacked relations `{r1, r2, r3}`
cut every 前提→ルート derivation path; nothing survives.

**Rejected — remove `(攻撃 s3 …)`.** Now `{r1, r2}` are attacked
but `r3` is not, so a derivation path survives and the compiler
answers with the concrete trace:

```text
遮断 継続論による反論: surviving path 競合参入 →r3→ 撤退判断
```

The same frame under `:要求 (被覆 関係)` instead reports the
unattacked relation directly:

```text
被覆 継続論による反論: unattacked r3 (relation r3 has no declared attack)
```

## 5. The verification catalog

Each catalog case is an executable acceptance test in
[`acceptanceCatalog.spec.ts`](../../packages/plgg-ir-thesis/src/domain/usecase/acceptanceCatalog.spec.ts).

| # | Check | Rejection counterexample |
| --- | --- | --- |
| 1 | Rebuttal completeness (`被覆` / `遮断`) | unattacked relation / surviving path |
| 2 | Framework totality (`全対応`) | the unaddressed node |
| 3 | Circular reasoning (`依存`) | the dependency cycle |
| 4 | Intra-stance consistency | the same-stance `反論` |
| 5 | Blind-spot (`多面性 n`) | the under-covered concept |
| 6 | Straw-man rejection | the undeclared attack target |
| 7 | Analogy soundness (`類推`) | the first unmatched step |
| 8 | Temporal coherence (`時間的`) | the cycle / non-monotonic edge |
| 9 | Transfer conservation (`移動的`) | the unbalanced node |
| 10 | Sort exclusivity (`:種`) | the mixed sorts |
| 11 | Composition commutativity (`合成`) | the diverging composite |
| 12 | Survival semantics | the grounded extension (surviving set) |
| 13 | Weights (`:重み` / `:客観性`) | carried inert in v1 |

## 6. Grounded extension and canonical IR

At the structure level, the **Dung grounded extension** over the
`反論` attack graph is the least fixed point of the characteristic
function (defended arguments) — polynomial. For the chain
A → B → C it yields the surviving set `{A, C}`.

Compilation also emits the canonical, versioned
`(plgg-ir-thesis 1 ...)` IR: normalization sorts each assertion's
and frame's attributes and clause children deterministically and
**idempotently** (`normalize ∘ normalize = normalize`), the same
property obligation the manifest carries. `plgg-ir-manifest` is
never touched, and the dependency direction (syntax → language →
thesis) is preserved.

```ts
import { compileThesis } from "plgg-ir-thesis";

const result = compileThesis(source);
// Result<
//   { nodes, canonical, surviving },
//   ReadonlyArray<SemDiagnostic>
// >
```

## 7. Non-goals (v1)

- **No truth evaluation** — the evaluator judges the *shape* of
  arguments, never whether a counter-relation semantically
  contradicts (symbol grounding stays with the reader).
- **No search** for rebuttal mappings or simulations (NP-hard);
  correspondences are always declared.
- **No weighted / gradual** argumentation semantics; `:重み` and
  `:客観性` are inert annotations.
- **No consumer / UI** interpretation of verified theses.

## 8. Verifying

```sh
./scripts/test-plgg.sh          # includes plgg-ir-thesis
./scripts/check-all.sh          # the full gate, >90% coverage
```

The dialect follows the house style throughout: `Option` not
null, `Result` not throw, exhaustive `match`, no
`as`/`any`/`ts-ignore`, and >90% coverage on statements,
branches, functions, and lines.
