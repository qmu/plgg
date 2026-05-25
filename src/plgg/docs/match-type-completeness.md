# `match` — Type-Level Completeness: Gap Analysis & Proposals

This document inventories the pattern-matching inconsistencies that the current
type machinery of `match` (`src/plgg/src/Flowables/match.ts`) **cannot** detect,
classifies each, and proposes a concrete type-level fix. Every gap is backed by a
compile-checked assertion in
[`match.completeness.spec.ts`](../src/Flowables/match.completeness.spec.ts);
`ArgMatchable` is exported so its accepted-argument contract can be asserted
directly.

This is an **identification + proposal** record. It does not mandate shipping
every fix; the implementations should be split into the dependent follow-up
tickets sketched at the end. All proposals are written to compile under the
repo's hard constraint — no `as`, `any`, or `@ts-ignore`/`@ts-expect-error`.

## The current coverage model

`ArgMatchable<PATTERNS, OTHERWISE_LAST, A>` is the type of `match`'s first
argument. When the supplied patterns do not cover the input union `A`, it
collapses that argument's type to `never`, which surfaces as a compile error at
the call site. `OTHERWISE_LAST` is derived per-overload from whether the **last**
pattern is the `otherwise` sentinel; when it is, `PATTERNS` excludes it.

It routes into one of four branches:

| # | Guard | Coverage rule |
|---|-------|---------------|
| a | `Is<A, boolean>` | patterns must be **exactly** the tuple `[true, false]` |
| b | `IsAllBoxPattern<PATTERNS>` | `FullCoveragedBoxes` — tag-subset coverage, **requires `AreAllTagPatterns`** |
| c | `IsAllAtomic<PATTERNS>` | `IsEqual<TupleToUnion<PATTERNS>, A>`, or a trailing `otherwise` whose union is a superset of `A` |
| d | else (mixed families) | `If<OTHERWISE_LAST, A, never>` — no real check; only the presence of a trailing `otherwise` |

The gaps below follow from the narrowness of these four rules.

## Gap inventory

### Gap 1 — Duplicate / overlapping atomic patterns are invisible *(false negative)*

```ts
// A = 1 | 2 | 3
match(a, [1, () => "a"], [2, () => "b"], [3, () => "c"], [3, () => "d"]);
//                                                        ^^^ unreachable, not flagged
```

Branch (c) tests `IsEqual<TupleToUnion<PATTERNS>, A>`. `TupleToUnion` is `T[number]`,
which collapses duplicates, so `[1, 2, 3, 3]` and `[1, 2, 3]` produce the same
union `1 | 2 | 3`. The redundant fourth branch — dead code at runtime — is
accepted. Overlapping (subsuming) patterns have the same blind spot.

**Classification:** false negative (unsound — accepts a match with an unreachable branch).

**Proposal:** add a recursive `HasDuplicate<PATTERNS>` helper and reject when it is
`true`. Sketch:

```ts
type HasDuplicate<T extends ReadonlyArray<unknown>> =
  T extends [infer Head, ...infer Tail]
    ? Tail extends ReadonlyArray<unknown>
      ? Includes<Tail, Head> extends true
        ? true
        : HasDuplicate<Tail>
      : false
    : false;

type Includes<T extends ReadonlyArray<unknown>, U> =
  T extends [infer Head, ...infer Tail]
    ? IsEqual<Head, U> extends true
      ? true
      : Tail extends ReadonlyArray<unknown>
        ? Includes<Tail, U>
        : false
    : false;
```

Gate branch (c) on `And<IsEqual<UNION_PATTERNS, A>, Not<HasDuplicate<PATTERNS>>>`.
For *subsumption* (one literal pattern covered by another) within purely atomic
literal patterns, equality is sufficient; subsumption only arises with wider
types, which the atomic branch does not admit. (`Not` is trivial via
`If<C, false, true>`.)

### Gap 2 — Boolean coverage is order- and shape-rigid *(over-restriction / false positive)*

```ts
match(a, [FALSE, () => "f"], [TRUE, () => "t"]);   // exhaustive, yet rejected (never)
match(a, [TRUE, () => "t"], [otherwise, () => "f"]); // exhaustive, yet rejected (never)
```

Branch (a) is `If<Is<PATTERNS, [true, false]>, A, never>`. It accepts **only** the
exact tuple `[true, false]`: a flipped `[false, true]`, and a `boolean` match
closed with `otherwise` (the boolean branch never consults `OTHERWISE_LAST`),
both collapse to `never`.

**Classification:** over-restriction (rejects valid, exhaustive matches).

**Proposal:** replace the exact-tuple test with an order-independent set check
reusing `IsUnionSubset`, and honor `otherwise`:

```ts
// boolean is exhaustive when { true, false } ⊆ patterns, OR a trailing otherwise exists
If<
  Or<
    IsUnionSubset<boolean, TupleToUnion<PATTERNS>>,
    OTHERWISE_LAST
  >,
  A,
  never
>
```

Combined with the Gap 1 `HasDuplicate` guard, `[true, true]` is then rejected as a
duplicate rather than silently treated as non-exhaustive.

### Gap 3 — A non-final `otherwise` is undetected *(false negative)*

```ts
// mixed families with a trailing otherwise — the *middle* otherwise is dead-coding the rest
match(a, [boxPat, fn], [otherwise, fn], [atomicPat, fn], [otherwise, fn]);
//                       ^^^^^^^^^ everything after this is unreachable, not flagged
```

`OTHERWISE_LAST` inspects only the final element. An `otherwise` elsewhere is
treated as an ordinary pattern. In the atomic branch it incidentally pollutes the
union and gets rejected for the *wrong* reason (union mismatch, not "otherwise
must be last"); in the mixed-family branch (Gap 5) it slips through entirely with
the trailing `otherwise` satisfying branch (d).

**Classification:** false negative (accepts dead branches; misleading diagnostics where it does reject).

**Proposal:** add an `OtherwiseOnlyLast<RAW_PATTERNS>` guard computed over the
**full, pre-stripped** pattern list (including the trailing `otherwise`), and
reject when an `otherwise` appears in any non-final slot:

```ts
type ContainsOtherwise<T extends ReadonlyArray<unknown>> =
  T extends [infer Head, ...infer Tail]
    ? Is<Head, typeof otherwise> extends true
      ? true
      : Tail extends ReadonlyArray<unknown>
        ? ContainsOtherwise<Tail>
        : false
    : false;

// applied to PATTERNS *after* stripping the legitimate trailing otherwise:
// if any remaining element is the sentinel, the placement is illegal.
type OtherwiseOnlyLast<STRIPPED extends ReadonlyArray<unknown>> =
  ContainsOtherwise<STRIPPED> extends true ? false : true;
```

This requires threading the raw pattern list (or a "stripped" copy) into
`ArgMatchable`; today only the post-strip `PATTERNS` is passed.

### Gap 4 — Object-body patterns disable box exhaustiveness *(false negative)*

```ts
// type AST = Box<"AST", { type: "root" | "leaf" | "branch" }>
match(a,
  [ast$({ type: "root" }),   () => "root"],
  [ast$({ type: "leaf" }),   () => "leaf"],
  [ast$({ type: "branch" }), () => "branch"],
  [otherwise, () => "?"],   // forced: object-pattern exhaustiveness is never proven
);
```

`FullCoveragedBoxes` requires `AreAllTagPatterns`. An object-body pattern
(`type: "object"`) is not a tag pattern, so a match built from object patterns can
never prove coverage and always falls back to demanding a trailing `otherwise` —
even when the object patterns enumerate every inhabitant of the discriminant.

**Classification:** false negative for the exhaustiveness *claim* (real coverage is
never provable; the `otherwise` is load-bearing and hides missing cases).

**Proposal:** extend coverage to object-body patterns by projecting the matched
discriminant field. This is the hardest gap: it needs the *discriminant key* and a
check that the union of pattern bodies covers `A`'s body union. A tractable first
step is to support a single, conventional discriminant (`type`) via a
`CoveredByObjectBodies<A, PATTERNS>` helper that extracts `body[type]` literals
from each `PatternBoxedObject` and runs `IsUnionSubset` against `A`'s
`content[type]`. General multi-field object exhaustiveness is likely out of scope
and should remain `otherwise`-gated with the gap documented.

### Gap 5 — Mixed pattern families bypass exhaustiveness *(false negative)*

```ts
match(a, [1, fn], [someBoxPattern, fn], [otherwise, fn]); // accepted with ZERO coverage analysis
```

A match mixing atomic and box-shaped patterns is neither all-atomic nor all-box,
so it lands in branch (d): `If<OTHERWISE_LAST, A, never>`. With a trailing
`otherwise` it is accepted with **no** coverage checking whatsoever; without one it
is rejected wholesale regardless of whether the explicit patterns were exhaustive.

**Classification:** false negative (no analysis in the mixed case).

**Proposal:** decompose `PATTERNS` into its atomic and box partitions and require
*each* partition to cover its slice of `A` (or accept a trailing `otherwise`).
This depends on Gaps 1/4 helpers and is the natural capstone follow-up.

### Gap 6 — Foreign discriminant tags are not rejected per-case *(false negative)*

`CaseDecl<A, PATTERN, R>` validates body compatibility (`PBODY` vs `ABODY`) for
boxed inputs but never checks that a `PatternIcon`'s `__tag` is a member of `A`'s
tag union. A typo'd or foreign tag is not rejected at the case level; it only ever
(maybe) shows up in aggregate coverage.

**Classification:** false negative (per-case mistakes pass; poor error locality).

**Proposal:** add a `TagsSubsetOf<A>` constraint inside `CaseDecl` for the
`PatternIcon` arm:

```ts
// when PATTERN is a tag pattern, require its __tag ∈ ExtractBoxTag<A>
If<
  IsPatternIcon<PATTERN>,
  IsUnionSubset<ExtractIconTag<PATTERN>, ExtractBoxTag<A>> extends true
    ? [PATTERN, (a: PBODY) => R]
    : never,
  /* ...existing arms... */
>
```

This localizes the error to the offending case tuple instead of the whole match.

### Gap 7 — Per-branch return-type mismatches are silently unioned *(design decision)*

All `CaseDecl<A, Pn, R>` share one `R`. Heterogeneous handler return types widen
`R` into a union rather than being flagged. Whether this is a bug or a feature is a
design choice: unioning is often *desirable* (e.g. mapping a variant to different
shapes). **Recommendation:** keep the union behavior as the default; if a
homogeneous-return variant is wanted, expose it as a separate, opt-in entry point
rather than changing `match`. Documented, not a defect.

### Gap 8 — Runtime no-match returns an `Error` typed as `R` *(type/runtime contract gap)*

```ts
return new Error(`Unexpectedly no match for value: ...`); // declared return type is R
```

When no case matches at runtime, `match` returns `new Error(...)` while its
declared return type is `R`. If a non-exhaustive call ever reaches this path (only
possible by exploiting one of the false-negative gaps above), the `Error` is
handed back masquerading as `R`.

**Classification:** type/runtime contract gap. Once the type-level gaps that let
non-exhaustive calls compile are closed, this path becomes genuinely unreachable
for well-typed callers.

**Proposal (runtime, not type-level):** `throw` instead of returning an `Error`, so
the function never yields a value that violates its return type. This adds a
runtime branch that must be covered by a test (note line 1315 of `match.ts` is
currently uncovered). Defer to a dedicated follow-up so the coverage work travels
with the behavior change.

## Summary

| Gap | Kind | Closeable at type level? |
|-----|------|--------------------------|
| 1. Duplicate atomic patterns | false negative | yes — `HasDuplicate` |
| 2. Boolean rigidity | over-restriction | yes — set check + honor `otherwise` |
| 3. Non-final `otherwise` | false negative | yes — `OtherwiseOnlyLast` over raw list |
| 4. Object-body exhaustiveness | false negative | partial — single discriminant only |
| 5. Mixed families | false negative | yes, but depends on 1 & 4 |
| 6. Foreign discriminant tags | false negative | yes — `TagsSubsetOf` in `CaseDecl` |
| 7. Heterogeneous returns | design decision | n/a — keep union, document |
| 8. No-match `Error` return | runtime contract | runtime fix (`throw`) |

## Recommended follow-up ticket sequencing

1. **Gap 2** (boolean) and **Gap 6** (per-case tag check) — self-contained, low risk, immediate value.
2. **Gap 1** (`HasDuplicate`) — foundational helper reused by Gap 5.
3. **Gap 3** (`OtherwiseOnlyLast`) — requires threading the raw pattern list through `ArgMatchable` and every overload; mechanical but touches all 19 arities.
4. **Gap 4** (object-body single-discriminant coverage), then **Gap 5** (mixed-family partitioning) as the capstone.
5. **Gap 8** (runtime `throw`) — independent; carries its own coverage test.

Each fix must be applied **consistently across all 19 arity overloads**
(`P1~P2` … `P1~P20`). Before implementing, factor the repeated
`OTHERWISE_LAST` / `PATTERNS` derivation into a shared helper type to avoid
divergence — but verify inference is unchanged, since overload inference is
sensitive to default type-parameter shapes.
