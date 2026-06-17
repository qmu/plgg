---
created_at: 2026-06-17T21:40:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 2h
commit_hash: 8a3eec5
category: Changed
depends_on: [20260617213958-guide-getting-started-and-concepts.md]
---

# Guide T4 — plgg core API: structures, errors & abstracts

## Overview

The second half of the `plgg` core reference: the structured collections, the
**error model**, the grammatical/type-level constructs, and the abstract
typeclass layer. Completes the guided plgg-core coverage begun in T3.

## Key Files

- `packages/guide/packages/plgg/*` (new pages under the plgg section).
- `packages/plgg/src/Collectives/` (Vec, MutVec, ReadonlyArray),
  `Conjunctives/` (Obj, Dict, RawObj), `Exceptionals/` (InvalidError,
  SerializeError, DeserializeError, Defect, Cause, PlggError, isPlggError,
  toError, panic, printPlggError, plggErrorMessage, matchPlggError,
  resultErrorMessage), `Grammaticals/` (Procedural, PromisedResult, NonNeverFn,
  Function, Brand), `Abstracts/Principals/` (Kind/HKT) and the typeclass
  instances (Functor/Apply/Applicative/Chain/Monad/Foldable/Traversable).

## Implementation Steps

1. **Collectives** — `Vec`/`MutVec`/`ReadonlyArray`: construction, validation
   (`conclude`-style accumulation), folding, JSON readiness.
2. **Conjunctives** — `Obj`/`Dict`/`RawObj`: decodable object shapes, `forProp`/
   `forOptionProp` aggregation, the `Dict<K,V>` map type.
3. **Exceptionals — the error model** (flagship page): errors are tagged `Box`
   data, not `Error` subclasses; the `PlggError` union (`InvalidError` with
   `sibling`, `SerializeError`, `DeserializeError`, `Defect` with a serializable
   `Cause`); the accessors (`plggErrorMessage`/`matchPlggError`/
   `resultErrorMessage`), `printPlggError`, and the `Error`-interop seam
   (`toError`/`panic`). Document decision A (typed errors are stackless; only
   `Defect` carries a stack).
4. **Grammaticals** — the type-level vocabulary: `Procedural`/`PromisedResult`,
   `NonNeverFn`, `Function`, `Brand`; how they shape `proc`/`cast` signatures.
5. **Abstracts** — the HKT/typeclass layer (`Kind`, `Functor`/`Monad`/… instances)
   for advanced users; note the grandfathered escape-hatch seams are
   intentional and not to be emulated.

## Considerations

- **The error model just changed (this is the current truth).** Document the
  data model only — `BaseError`/`Exception` are deleted. Use the new accessors
  in examples, not the `result.content.content.message` double-hop.
  (`packages/plgg/src/Exceptionals/`)
- **Abstracts are advanced.** Keep the typeclass page approachable: explain the
  instances via `Option`/`Result` rather than category theory; mark it optional
  reading.
- Sibling of T3; keep the page template identical.
  ([[20260617213959-guide-plgg-core-values-effects]])
- Pull examples from the `Exceptionals`/`Collectives`/`Conjunctives` specs.

## Final Report

Development completed as planned. Wrote `structures-errors.md` covering
Collectives (Vec/MutVec/asVecOf + conclude accumulation), Conjunctives
(Obj/Dict/RawObj), the Exceptionals error model (PlggError union, Decision A,
the named accessors, toError/panic seam), Grammaticals (Procedural/
PromisedResult/NonNeverFn/Brand), and the optional Abstracts typeclass layer.
All shapes verified against source.

### Discovered Insights

- **Insight**: The shipped error model carries `Cause` as
  `{ name; message; stack: Option<SoftStr> }`, and only `Defect` populates it —
  `InvalidError`/`SerializeError`/`DeserializeError` are stackless by design
  (Decision A). The guide documents this as why typed failures are cheap and
  wire-safe.
- **Insight**: `toError`/`panic` are the *only* sanctioned throw in the codebase
  — an outer-seam adapter, not for domain use. Documenting them as a boundary
  seam (not a general utility) keeps the errors-as-values contract intact.
- **Insight**: The abstract/HKT layer contains a few grandfathered `as`-based
  escape hatches that are intentional and internal; the page explicitly marks
  them as not-to-emulate so readers don't take them as license against the
  strict no-`as` rule.
