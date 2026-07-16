# plgg-ir-language

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

**A reusable static language-processing framework** for the
`plgg-ir` family, built on [plgg](../plgg/) and
[plgg-ir-syntax](../plgg-ir-syntax/). It provides the machinery a
restricted, statically analyzed IR dialect is made of — and defines
**no Domain Manifest vocabulary** (no `entity`, `field`, `view`,
`policy`; that is `plgg-ir-manifest`, the next layer).

```
plgg ── plgg-parser ── plgg-ir-syntax ── plgg-ir-language ── plgg-ir-manifest (next)
```

## What it provides

- **Semantic types (`SemType`)** — shared primitives, nominal
  domain types (`client-id ≠ organization-id` even when both are
  stored as strings), and parameterized types
  (`(money JPY) ≠ (money USD)`). `isAssignable` adds the one
  shared widening (`integer` → `decimal`).
- **Operators** — a closed registry; each operator's typing rule is
  a plain function `(argTypes, range) → Result<SemType, diags>`.
  `fixedSignature` covers the common case with arity checks and
  expected/actual mismatch diagnostics; polymorphic rules
  (`Money<C> × Percentage → Money<C>`) are written as branching —
  no unification engine.
- **Scopes and kinded bindings** — immutable scope frames;
  bindings carry a *kind* (`"entity"`, `"field"`, … — dialect
  vocabulary), and a reference of one kind never resolves to
  another. `mergeBindings` diagnoses duplicate declarations with
  the first location attached.
- **Forms (`FormDef<N>`)** — the dialect's closed vocabulary over
  a dialect-owned node type `N`. Analysis is **two-phase**:
  `declare` (pass 1) contributes bindings to the root scope so
  forward references work; `analyze` (pass 2) runs with the full
  scope and the two recursion seams (`checkExpr`, `analyzeForm`).
- **Type checker (`checkExprOf`)** — literals, typed references,
  and operator applications; diagnostics accumulate across every
  operand, never fail-fast.
- **Diagnostics (`SemDiagnostic`)** — the family error model
  (stable `language.*` codes, severity, message, range) extended
  with expected/actual context and related locations, shaped for
  LLM correction loops.
- **Expansion** — registered shorthand rewrites
  (`(flag x)` → `(def x boolean)`) applied bottom-up before
  analysis, with a depth bound against self-producing expanders.
- **Normalization + canonical serializer** — registered
  `Sexp → Sexp` rules applied in order, then canonical printing;
  `normalize(normalize(x)) = normalize(x)` and equivalent sources
  produce identical canonical text (property-tested).
- **Dialect composition (`compose`, `mapDialect`)** — dialects are
  statically registered slices of forms/operators/expanders/
  normalizers; name collisions are composition errors. `Dialect<N>`
  is invariant in `N`, so `mapDialect` is the seam that lifts a
  dialect to a composition's wider node type: the composition's
  scope flows into the mapped forms, their interior vocabulary
  stays their own.
- **The pipeline (`compileSource`)** —
  `parse → expand → analyze → normalize → canonical print`, all
  diagnostics in one list, nothing thrown.

## Conventions

- `as` / `any` / `ts-ignore` are prohibited (see root `CLAUDE.md`).
- Runtime dependencies are `plgg` and `plgg-ir-syntax` only.
- After editing a `file:`-linked dependency's source, rebuild its
  `dist` or this package won't see new exports.
