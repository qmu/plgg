---
created_at: 2026-07-01T20:42:05+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
depends_on:
---

# Add `refinedBrand` factory to collapse the refined-brand smart-constructor idiom

## Overview

Refined scalar brands are hand-written as a fixed **five-part idiom** that differs between instances only in the tag, the `qualify` predicate, and the error constructor: (1) `type X = Box<"X", string>`, (2) a `qualify` predicate, (3) `isX = isBoxWithTag("X")(v) && qualify(v.content)`, (4) a triple-branch `asX` caster (`isX ? ok(v) : qualify(v) ? ok(box("X")(v)) : err(errorFor(v))`), (5) an `xString` unwrapper. `Version.ts` and `TenantId.ts` are near-identical byte-for-byte modulo those three inputs. Add a foundation factory that emits `{ is, as, unwrap }` (type derived) from one predicate + one error builder.

Proposed shape (config-first, no escape hatch):

```ts
// packages/plgg/src/Grammaticals/RefinedBrand.ts
export const refinedBrand = <
  const TAG extends string,
  CONTENT,
  E,
>(
  tag: TAG,
  qualify: (v: unknown) => v is CONTENT,
  errorFor: (v: unknown) => E,
): {
  is: (v: unknown) => v is Box<TAG, CONTENT>;
  as: (v: unknown) => Result<Box<TAG, CONTENT>, E>;
  unwrap: (b: Box<TAG, CONTENT>) => CONTENT;
} => ({
  is: (v): v is Box<TAG, CONTENT> =>
    isBoxWithTag(tag)(v) && qualify(v.content),
  as: (v) =>
    isBoxWithTag(tag)(v) && qualify(v.content)
      ? ok(v)
      : qualify(v)
        ? ok(box(tag)(v))
        : err(errorFor(v)),
  unwrap: (b) => b.content,
});
```

Before (`plgg-db-migration/.../Version.ts`, ~50 lines) → after (one `refinedBrand("Version", qualify, versionShapeFor)` call + the `Version` type alias). `TenantId.ts` collapses identically with its own `qualify`/error. The factory is driven by the single `qualify` predicate, so the "does it already qualify as a box vs. a bare content" triple-branch is written once in the foundation, not re-derived per model.

**Trip Origin:** none — spun off from the foundation-semantics audit ([20260701201654-audit-foundation-semantics-repetition.md](.workaholic/tickets/archive/work-20260701-185044/20260701201654-audit-foundation-semantics-repetition.md)).

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — lands in **Grammaticals** (beside `Brand`), re-exported through `Grammaticals/index.ts` → `src/index.ts`; no new category.
- `workaholic:implementation` / `policies/coding-standards.md` — the `qualify`/`is`/`as` typing must hold with no escape hatch; the `qualify: (v) => v is CONTENT` guard is a real predicate, not a cast.
- `workaholic:implementation` / `policies/type-driven-design.md` — a refined brand narrows a bare `string` to a domain-validated `Box<TAG, string>`; the factory must keep that nominal distinction (a raw string can never be mistaken for a validated value).
- `workaholic:implementation` / `policies/functional-programming.md` — returns standalone `is`/`as`/`unwrap` functions; no methods-on-data.
- `workaholic:implementation` / `policies/objective-documentation.md` — each branded model keeps its "why branded" JSDoc (e.g. Version's total-order rationale).
- `plgg-coding-style` (skill) — `asX`/`isX` naming, caster-at-every-boundary, Prettier printWidth 50, colocated spec.

Repo constraints: `.workaholic/constraints/architecture.md`, `.workaholic/constraints/quality.md`.

## Key Files

- `packages/plgg/src/Grammaticals/Brand.ts` — the existing `Brand<T,U>` nominal type; note the refined-brand idiom actually uses `Box`, not `Brand` — reconcile whether the factory returns a `Box`-based brand (as today) and whether `Brand` stays a separate lighter primitive.
- `packages/plgg/src/Contextuals/Box.ts` — `box`, `isBoxWithTag` the factory composes over.
- `packages/plgg/src/Grammaticals/index.ts`, `packages/plgg/src/index.ts` — export wiring.

Repetition sites to migrate:

- `packages/plgg-db-migration/src/domain/model/Version.ts` — full five-part idiom (lines 22-60) plus a hand-rolled comparator (out of scope here; owned by ticket 20260701204206).
- `packages/plgg-db-migration/src/domain/model/TenantId.ts` — the same idiom (lines 21-56), differing only in tag/qualify/error.

## Related History

- [20260527023826-result-maperr-and-json-codec.md](.workaholic/tickets/archive/work-20260513-182057/20260527023826-result-maperr-and-json-codec.md) — precedent for adding a missing core caster/eliminator to the Result surface.
- [20260626122207-refactor-spec-validation-examples-to-cast-refine.md](.workaholic/tickets/archive/work-20260626-221353/20260626122207-refactor-spec-validation-examples-to-cast-refine.md) — replacing hand-rolled validation with core combinators (`cast`/`refine`); same class of refactor.
- The six deferred branded-type tickets ([20260701013300-refine-softstr-to-str-domain-strings.md](.workaholic/tickets/todo/a-qmu-jp/20260701013300-refine-softstr-to-str-domain-strings.md) and siblings) own the *where-to-apply-brands* axis; this ticket provides the *factory* they can lean on but does not re-propose their call sites.

## Implementation Steps

1. Add `packages/plgg/src/Grammaticals/RefinedBrand.ts` with `refinedBrand` per the sketch; prove `is`/`as`/`unwrap` type without escape hatches. Decide (and document in JSDoc) whether it interoperates with `cast`/`Castable` so a refined brand is usable at `forProp`/`forContent` boundaries.
2. Colocate `RefinedBrand.spec.ts`: cover `as` for all three branches (already-branded → ok, bare-qualifying → ok(box), non-qualifying → err), `is` (+/-), `unwrap` round-trips, and a literal-tag type assertion.
3. Wire `Grammaticals/index.ts` and `src/index.ts`.
4. Migrate `Version.ts` and `TenantId.ts` to `refinedBrand`, preserving public names (`isVersion`, `asVersion`, `versionString`, the `Version` type; likewise TenantId) and their `MigrationError` shape-error wiring. `compareVersion` stays as-is (handled by ticket 20260701204206).
5. Run `scripts/tsc-plgg.sh` + `scripts/test-plgg.sh`; keep coverage ≥90%.

## Quality Gate

**Acceptance criteria:**
- `refinedBrand(tag, qualify, errorFor)` returns `{ is, as, unwrap }` with `as` reproducing the exact three-branch semantics (already-branded / bare-qualifying / reject) and `unwrap` returning the content.
- `Version` and `TenantId` migrated to one `refinedBrand` call each, public export names and error behavior unchanged; their spec suites pass unmodified (or minimally adjusted only for import paths).
- No `as`/`any`/`@ts-ignore`/`@ts-expect-error` in `RefinedBrand.ts` or the migrations (a deliberate type-level negative assertion excepted).
- Tag typed as a literal (asserted at type level).

**Verification method:**
- `scripts/tsc-plgg.sh` exits 0; `scripts/test-plgg.sh` green, coverage ≥90%.
- `RefinedBrand.spec.ts` covers the three `as` branches + `is`(+/-) + `unwrap`.
- Existing `Version.spec.ts`/`TenantId.spec.ts` (if present) stay green as the migration oracle.

**Gate:** tsc + test green, ≥90% coverage, no escape hatch, both models migrated with identical public surface and error semantics, printWidth-50 conforming.

## Considerations

- **`Brand` vs `Box`-brand.** The idiom brands via `Box<"X", string>`, not the `Brand<T,U>` intersection type. Decide whether `refinedBrand` stays `Box`-based (recommended — matches existing models and gives a `content` field) and whether `Brand` remains a distinct zero-cost primitive; document the choice (`packages/plgg/src/Grammaticals/Brand.ts`).
- **Interop with the deferred branded-type tickets.** `Str`/`Int`/`Uint`/`Float` (tickets 20260701013300-04) are the call sites; `refinedBrand` is infrastructure they can adopt. Keep it general enough (`CONTENT` not fixed to `string`) that a numeric brand can use it, but do not migrate those sites here.
- **`errorFor` shape.** Version/TenantId build a `MigrationError`; the factory must not assume a specific error type — keep `E` free so each consumer supplies its own (`packages/plgg-db-migration/src/domain/model/MigrationError.ts`).
- May build on `defineVariant` (ticket 20260701204204) for the box/guard half; optional, not a hard dependency.
