# The Thesis dialect — argumentation, from syntax to semantics

The **Thesis dialect** (`plgg-ir-thesis`) is the second dialect on the
plgg-ir stack, sitting on the `plgg-ir-language` layer beside the Domain
Manifest (see [the plgg-ir guide](guide.md)). Where the Manifest dialect
models a *domain*, the Thesis dialect models an *argument*: it carries the
qmu [概念メタモデル](https://strategy.qmu.dev/metamodel)'s closed vocabulary
(主張 / 概念 / 関係 / フレーム / 論旨 / 論評 / ストラクチャー) and gives it a
**statically checkable, formally verifiable** meaning — whether a rebuttal
is complete, whether an argument begs the question, which theses survive an
attack graph.

This guide explains the dialect **from the syntax up, then the semantics**.
For a runnable end-to-end demonstration (the `npm run prove` command and its
output), see [A runnable formal-proof worked example](proof-example.md). The
authoritative source is the strategy book's
[metamodel](https://strategy.qmu.dev/metamodel) and its
[formal semantics](https://strategy.qmu.dev/metamodel-semantics); this page
is the in-repo, implementation-grounded companion.

---

# Part 1 — The syntax

## 1.1 Why S-expressions

The Thesis surface syntax is an **S-expression** language (Lisp-style
parentheses). It has exactly three lexical elements:

- **atoms** — bare symbols like `撤退論`, `r1`, `因果的`;
- **keywords** — attribute labels that begin with `:`, like `:ロジック`;
- **lists** — parenthesised, nestable `( … )`.

There are no implicit conversions (the way YAML turns `no` into `false` or
`2026-07-17` into a date), position tracking is trivial, and any sub-form
can be sliced out mechanically. That is what makes the syntax a good
contract with a *probabilistic* writer (an LLM): the meaning of a document
is fixed by its brackets, not by a parser's mood. (The longer argument is in
[why a DSL, not YAML](https://strategy.qmu.dev/metamodel-dsl).)

## 1.2 The forms (the vocabulary is closed)

Only the metamodel's forms may be declared. An unknown form name is
rejected at compile time — the vocabulary is **closed**.

### `主張` (Assertion) — a DAG of relations between concepts

```lisp
(主張 撤退論                          ; name
  :ロジック 因果的                     ; the relation-forming rule (one of 7 logics)
  :ルート (概念 撤退判断)              ; the root concept (the conclusion)
  (関係 r1 :接続元 (概念 需要縮小) :接続先 (概念 売上減))
  (関係 r2 :接続元 (概念 売上減)   :接続先 (概念 撤退判断))
  (関係 r3 :接続元 (概念 競合参入) :接続先 (概念 撤退判断)))
```

- **`概念` (Concept)** — `(概念 名前)`, a node of the argument graph.
- **`関係` (Relation)** — `名前 :接続元 概念 :接続先 概念`, a directed edge
  from source (接続元) to target (接続先). The name (`r1`, `r2`, …) is a
  **bound identifier**, not a bare string — it can be referenced later, and
  a reference that does not resolve is a compile error.
- **`:ルート`** — the concept the derivation terminates at. An assertion is
  thus a directed graph "premises → root".
- **`:ロジック`** — the assertion's single relation-forming rule; every
  relation in one assertion shares it (logic uniformity).

### `フレーム` (Frame) — a relation *between* assertions (here, a rebuttal)

```lisp
(フレーム 継続論による反論
  :種別 反論
  :接続元 継続論                       ; the attacking assertion
  :接続先 撤退論                       ; the attacked assertion
  :要求 (遮断 前提→ルート)             ; which completeness property to demand
  (攻撃 s1 掘り崩し r1)                ; s1 (of 継続論) attacks r1 (of 撤退論), by undermine
  (攻撃 s2 切り崩し r2)
  (攻撃 s3 掘り崩し r3))
```

- **`攻撃` (Attack)** — `攻撃元関係 攻撃型 攻撃先関係`: a relation of the
  attacker points, with a typed mode, at a relation of the target.
- **`:要求`** — the completeness property the verifier must check (`遮断` or
  `被覆`, below); the default is `遮断`.

### The closed vocabulary

- **Logics (7)** — 因果的 / 構成的 / 時間的 / 推移的 / 移動的 / 勾配的 /
  演繹的.
- **Attack types (3)**, imported from structured argumentation theory:
  - **反駁** (rebut) — attacks the root concept (the conclusion itself);
  - **切り崩し** (undercut) — attacks the *application of the logic* (that
    the inference holds at all);
  - **掘り崩し** (undermine) — attacks a premise / an individual relation.
- **Forms** — 主張・概念・関係・フレーム・文脈・論旨・論評・ストラクチャー.

## 1.3 From text to a typed model

`compileThesis(source)` parses this S-expression source and compiles it to
**typed `Assertion` / `Frame` values** (the `plgg-ir-thesis` model). Unknown
forms, malformed attributes, and unbound references are rejected here, as
ranged diagnostics. Because the metamodel is written in Japanese, the closed
vocabulary is Japanese too — so what is proven downstream is *the
metamodel's own concept*, not an ad-hoc re-encoding of it.

---

# Part 2 — The semantics

## 2.1 The foundation: modal logic and model-checking, not proof search

The intended semantics rests on **modal logic and its model-checking**, not
on the non-deterministic machinery of predicate logic (unbounded ∀/∃,
witness search, unification). This is a structural choice, not a taste:

- **van Benthem's characterisation theorem** — modal logic is *exactly* the
  bisimulation-invariant fragment of first-order logic. A language that can
  only talk about "properties that depend on the shape of the structure"
  lines up precisely with the metamodel's requirement that a framework be
  content-independent.
- **Quantification is guarded** — the modal `◇` / `□` only ever range over
  the declared accessibility relation, so the search-space blow-up of
  unbounded quantifiers never enters at the language level.
- **Finite models, model-checking** — the object under test is a finite
  Kripke model the writer declared; the question asked is model-checking,
  not satisfiability. It runs in polynomial (often linear) time, and it can
  **return a counterexample** (the violating path). That counterexample is
  the machine-fixable diagnostic the writer's loop consumes.

The semantic correspondence: **concept = state (possible world), relation =
accessibility relation typed by its logic, assertion = finite Kripke model +
a root state.**

This realises plgg-ir's motto — *"don't guess; declare and reject"* — in the
argumentation setting: the writer declares the model, the compiler checks a
modal formula and either accepts or rejects **with a counterexample**.

## 2.2 反論の完全性 (rebuttal completeness) — the two checks that ship

An `Assertion` is a directed graph "premises → root". A **premise** is a
concept with no incoming relation (a leaf a derivation starts from); the
root always has incoming edges, so it is never a premise. A rebuttal frame's
completeness is a graph model-check over this DAG (`verifyRebuttal.ts`).

### 遮断 (severing / cut) — the default

> After removing every relation the frame attacks, no premise concept still
> reaches the root.

```
attacked  = { target relations whose name is some attack's 接続先 }
residual  = target relations − attacked
accept    ⟺ no path premise → root exists in `residual`
```

As a modal formula this is **`¬⟨any*⟩root`** on the residual graph: no
iterated-reachability path to the root survives. This is *logical*
completeness — "have all the derivation paths to the conclusion been cut?" —
and it is what earns the name 反論, so it is the default.

- The complete rebuttal severs r1, r2, and r3 → no path survives →
  **accept**.
- Removing `(攻撃 s3 掘り崩し r3)` leaves r3 in place → the path
  `競合参入 →r3→ 撤退判断` survives → **reject**, and that surviving path is
  the counterexample trace.

### 被覆 (coverage)

> Every relation of the target has at least one attack mapped onto it.

```
accept  ⟺ every target relation's name appears as some attack's 接続先
```

As a modal formula this is **`[U](edge → attacked)`** — universally, each
edge is attacked. This is *checklist* completeness — "did the rebuttal touch
everything the opponent said?". Removing s3 leaves r3 unattacked → **reject**,
naming the unattacked relation as the counterexample.

A frame chooses which property to demand via `:要求`; the default is 遮断.

### Why the straw man is syntactically impossible

If an attack names a relation that the target never declared (`r9`), it
simply **matches nothing** when collecting the attacked set — the graph
checks never crash on it, and the phantom attack has no effect. Attacking
something the opponent did not say cannot carry weight, because the
reference does not resolve. (Naming a specific relation to attack uses its
bound identifier; an unbound one is rejected at compile time.)

## 2.3 生存判定 — Dung's grounded extension

Over an *attack graph of theses* (nodes = arguments, edges = attacks), the
dialect computes **Dung's grounded extension** by the standard monotone
characteristic-function fixpoint (`groundedExtension.ts`):

> An argument is *defended* by a set S when every argument that attacks it is
> itself attacked by S. Iteratively collect the defended arguments; the least
> fixpoint is the grounded (survivor) set.

For the 論争空間 example — 増税必要論; 景気失速論 attacks 増税必要論;
外需回復論 attacks 景気失速論:

- 外需回復論 is attacked by no one → it survives → it defeats 景気失速論 →
  the attack on 増税必要論 is neutralised → 増税必要論 survives.
- **survivors {増税必要論, 外需回復論}, defeated {景気失速論}** — computed in
  polynomial time.

## 2.4 The seven logics as modal families

Each logic pins a modal family whose **frame condition is the static check**
(this is the target the dialect grows toward; 因果的 / 構成的 ship, the rest
land as their catalogue cases are implemented):

| Logic | Modal family | Frame condition = static check |
| --- | --- | --- |
| 因果的 | basic modal K (`⟨cause⟩`) | directedness only |
| 構成的 | mereological (S4: transitive, reflexive) | containment transitivity, partial order |
| 時間的 | **GL (Löb)** / CTL on a DAG | "be a DAG" *is* GL's frame condition (transitive + converse-well-founded) |
| 推移的 | PDL (`α;β`, `α∪β`, `α*`) | transition typing, `*` path checks |
| 移動的 | multi-agent dynamic modality | supply/receipt balance |
| 勾配的 | graded / metric modality (`◇_{≥k}`) | numeric attributes, unit coherence |
| 演繹的 | propositional core | boolean coherence, contradiction |

"A relation continuous under a uniform rule" (the metamodel's definition of a
主張) reads in PDL as `⟨L*⟩` — single-modality iterated reachability — so the
"trail = regular-expression path" intuition becomes a formula directly.

## 2.5 The safety valve: declaration buys decidability

The complexity guard is **declarationism**. Asking "does a complete rebuttal
*exist*?" collapses into subgraph-homomorphism search (NP-hard) the moment
it is posed. But the correspondence (which attack hits which relation) is
*always declared by the writer*, and the compiler only checks it. On the
modal side, staying within model-checking keeps every check polynomial. Every
rejection returns a ranged, human-readable counterexample (`SemDiagnostic`,
plgg-ir's universal diagnostic shape), which is exactly the input to the
"the writer adds a declaration and recompiles" loop.

---

## See also

- [A runnable formal-proof worked example](proof-example.md) — the
  `npm run prove` command and its verified output (accept + counterexample
  traces).
- [The plgg-ir Guide](guide.md) — the three-layer family (syntax → language
  → manifest) the Thesis dialect rides on.
- The strategy book:
  [概念メタモデル](https://strategy.qmu.dev/metamodel) ·
  [形式意味論](https://strategy.qmu.dev/metamodel-semantics) ·
  [なぜ DSL か](https://strategy.qmu.dev/metamodel-dsl).
